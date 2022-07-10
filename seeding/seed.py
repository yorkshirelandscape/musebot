#! /bin/env python3

import argparse
import collections
import csv
import functools
import itertools
import math
import operator
import os
import random
import re
import sys
import unicodedata
import uuid

TESTING = False

# Default values for these settings
# May be modified by command line arguments
BADNESS_MAX_ARTIST = 50
BADNESS_MAX_SUBMITTER = 1000
BADNESS_MAX_SEED = 100
BADNESS_MAX_DUPER = 25
ITERATIONS = 15000
ATTEMPTS = 15
ATTEMPT_ITERATIONS = 400

force_output = True
drop_dupes_first = True
output_csv_tabs = True
output_order = 'bracket'
output_dropped = True
input_csv_path =  'seeding/input.csv'
output_csv_path = 'seeding/output.csv'

ORDERS = {
    128: [
        1, 128, 64, 65, 32, 97,  33, 96, 16, 113, 49, 80, 17, 112, 48, 81,
        8, 121, 57, 72, 25, 104, 40, 89, 9,  120, 56, 73, 24, 105, 41, 88,
        4, 125, 61, 68, 29, 100, 36, 93, 13, 116, 52, 77, 20, 109, 45, 84,
        5, 124, 60, 69, 28, 101, 37, 92, 12, 117, 53, 76, 21, 108, 44, 85,
        2, 127, 63, 66, 31, 98,  34, 95, 15, 114, 50, 79, 18, 111, 47, 82,
        7, 122, 58, 71, 26, 103, 39, 90, 10, 119, 55, 74, 23, 106, 42, 87,
        3, 126, 62, 67, 30, 99,  35, 94, 14, 115, 51, 78, 19, 110, 46, 83,
        6, 123, 59, 70, 27, 102, 38, 91, 11, 118, 54, 75, 22, 107, 43, 86,
    ],
    96: [
        64, 65, 1, 33, 96, 32, 49, 80, 16, 48, 81, 17,
        57, 72, 8, 40, 89, 25, 56, 73, 9,  41, 88, 24,
        61, 68, 4, 36, 93, 29, 52, 77, 13, 45, 84, 20,
        60, 69, 5, 37, 92, 28, 53, 76, 12, 44, 85, 21,
        63, 66, 2, 34, 95, 31, 50, 79, 15, 47, 82, 18,
        58, 71, 7, 39, 90, 26, 55, 74, 10, 42, 87, 23,
        62, 67, 3, 35, 94, 30, 51, 78, 14, 46, 83, 19,
        59, 70, 6, 38, 91, 27, 54, 75, 11, 43, 86, 22,
    ],
    64: [
        1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9,  56, 24, 41,
        4, 61, 29, 36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44,
        2, 63, 31, 34, 15, 50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42,
        3, 62, 30, 35, 14, 51, 19, 46, 6, 59, 27, 38, 11, 54, 22, 43,
    ],
    48: [
        32, 33, 17, 48, 25, 40, 24, 41, 29, 36, 20, 45,
        28, 37, 21, 44, 31, 34, 18, 47, 26, 39, 23, 42,
        30, 35, 19, 46, 27, 38, 22, 43, 1,  16, 8,  9,
        4,  13, 5,  12, 2,  15, 7,  10, 3,  14, 6,  11,
    ]
}


def get_distance(i, j):
    """
    Calculates the number of rounds before two songs would meet in a match.

    If the songs would meet in the first round, returns 0. To determine a more
    human-readable (1-indexed) round number for when two songs would meet (or,
    the maximum number of rounds), call with 0 and the maximum slot number (i.e.
    ``len(submissions) - 1``).

    :param i: The 0-based index position of the first song
    :param j: The 0-based index position of the second song
    :returns: Integer indicating the number of rounds until these two songs meet
    """
    return math.floor(math.log2(i ^ j))


def get_analysis(seeds, submissions):
    """
    Constructs statistics for anomalous submitter and artist distribution.

    For the given set of submissions and seed order, determines the distribution
    of songs for each submitter for each artist, returning anything that seems
    potentially anomalous for manual review.

    The returned data structure is a dict broken down by round number, where
    each round is a dict that may include any or all of the following keys:
        - ``submitters`` a per-submitter dict mapping group number to the
            specific songs submitted by that submitter within the group
        - ``artists`` the same thing but for artists
        - ``seeds`` for the first round only, a dict mapping match number to
            submission pairs for any ``{0, 1}`` seeds matched up against other
            ``{0, 1}`` seeds

    If a round has nothing to report, it will be omitted from the returned dict.

    :param seeds: Seed order to analyze
    :param submissions: List of `Submission` instances to sort
    :returns: The data structure described above, which may be an empty dict
    """

    ordered_submissions = [Submission.copy(submissions[j], slot=i, q=int(i // (len(submissions) / 4))) for i, j in enumerate(seeds)]
    counts = collections.defaultdict(collections.Counter)
    results = collections.defaultdict(lambda: collections.defaultdict(dict))
    max_round = get_distance(0, len(seeds) - 1) + 1

    for submission in ordered_submissions:
        counts[submission.submitter][0] = 0
        counts[submission.submitter][1] = 0
        counts[submission.submitter][2] = 0
        counts[submission.submitter][3] = 0

    for submission in ordered_submissions:
        counts[submission.submitter][submission.q] += 1

    for key, value in sorted(counts.items()):
        print("{:<15}".format(key), *(v for k, v in sorted(value.items())), sep='\t')

    def get_keyfunc(round):
        return lambda x: x // (2 ** round)

    for key, attr in [("submitters", "submitter_cmp"), ("artists", "artist_cmp")]:
        vals = {getattr(submission, attr) for submission in submissions}
        for val in vals:
            # The positions of all the relevant songs
            slots = [
                i
                for i, submission in enumerate(ordered_submissions)
                if getattr(submission, attr) == val
            ]
            if len(slots) <= 1:
                # Only one entry, nothing to meet, much less meet too early
                continue
            # Analyze the quartiles, octiles, or respective groupings for each round
            # Don't analyze the finals, though, everything is allowed there
            for round in range(1, max_round):
                # First figure out what we should be seeing
                num_groups = 2 ** (max_round - round)
                allowed_sizes = {
                    math.floor(len(slots) / num_groups),
                    math.ceil(len(slots) / num_groups),
                }
                # Now split into the actual groups
                # We do this here since we're interested in the size of the groups,
                # otherwise we could just record while iterating through the groupby
                groups = {
                    # Use k + 1 to get 1-indexed numbers here for readability
                    k + 1: tuple(g)
                    for k, g in itertools.groupby(slots, get_keyfunc(round))
                }
                if all(len(g) in allowed_sizes for g in groups.values()):
                    # Nothing to record, avoid adding empty dicts to the results
                    continue
                # Record any groups with invalid sizes
                results[round][key][val] = {
                    k: tuple(ordered_submissions[i] for i in g)
                    for k, g in groups.items()
                    if len(g) not in allowed_sizes
                }

    # Special case to list specific collisions in the first round:
    # - {0, 1} vs. {0, 1}
    # - submitter vs dupe
    match = 0
    for submission1, submission2 in chunk(ordered_submissions, 2):
        match += 1
        if submission1.seed in {0, 1} and submission2.seed in {0, 1}:
            results[1]["seeds"][match] = (submission1, submission2)
        results[1]["dupes"][match] = []
        if submission1.submitter_cmp in submission2.dupers:
            results[1]["dupes"][match].append((submission1.submitter, submission2))
        if submission2.submitter_cmp in submission1.dupers:
            results[1]["dupes"][match].append((submission2.submitter, submission1))

    # Special case to list specific collisions in the second round:
    # - {0, 1} vs. {0, 1}
    # - submitter vs dupe
    match = 0
    for submissions_chunk in chunk(ordered_submissions, 4):
        match += 1
        if (
            {submissions_chunk[0].seed, submissions_chunk[1].seed} & {0, 1}
            and {submissions_chunk[2].seed, submissions_chunk[3].seed} & {0, 1}
        ):
            # Pick the first {0,1}-seed in each pair to represent something Bad
            # There may be multiple Bad things here, but just mention the first
            # one we find
            submission1 = next(s for s in submissions_chunk[:2] if s.seed in {0, 1})
            submission2 = next(s for s in submissions_chunk[2:] if s.seed in {0, 1})
            results[2]["seeds"][match] = (submission1, submission2)
        # Could generate this by being tricky, but probably better to be explicit
        # Checks all potential matchups within the chunk
        results[2]["dupes"][match] = []
        for i, j in ((0, 2), (0, 3), (1, 2), (1, 3)):
            submission1 = submissions_chunk[i]
            submission2 = submissions_chunk[j]
            if submission1.submitter_cmp in submission2.dupers:
                results[2]["dupes"][match].append((submission1.submitter, submission2))
            if submission2.submitter_cmp in submission1.dupers:
                results[2]["dupes"][match].append((submission2.submitter, submission1))

    # If we have any byes, make sure they match against the lowest possible seeds
    # Also make sure they are in the expected slots
    if submissions[-1].is_bye:
        allowed_seeds = [
            submission.seed
            for submission in sorted(submissions, key=operator.attrgetter("seed"))
        ][:int(len(submissions) / 4)]
        max_allowed_seed = max(allowed_seeds)
        match = 0
        for submission1, submission2 in chunk(ordered_submissions, 2):
            match += 1
            # Only the second submission of even numbered matches can be a bye,
            # and it *must* be a bye
            if submission1.is_bye or submission2.is_bye is bool(match % 2):
                results[1]["byes"][match] = (submission1, submission2)
                # Incorrect layout is all that needs to be reported
                continue
            if match % 2:
                # Odd numbered matches have no bye
                continue
            # The layout is correct and we're in a match with a bye
            # Now make sure the seeds are good
            if submission1.seed > max_allowed_seed:
                results[1]["byes"][match] = (submission1, submission2)
        # If we haven't seen any issues yet, verify that the number of each seed
        # matched against a bye is exactly what we expect
        if 1 not in results or "byes" not in results[1]:
            actual_seeds = sorted(ordered_submissions[i].seed for i in range(2, len(submissions), 4))
            if allowed_seeds != actual_seeds:
                # We have a problem, count up each seed and record any disparities
                allowed_counts = collections.Counter(allowed_seeds)
                actual_counts = collections.Counter(actual_seeds)
                results[1]["byes"]["totals"] = {}
                for k in set(allowed_counts) | set(actual_counts):
                    if allowed_counts[k] != actual_counts[k]:
                        results[1]["byes"]["totals"][k] = (allowed_counts[k], actual_counts[k])

    return results


# https://stackoverflow.com/a/22045226
def chunk(lst, n):
    """
    Returns successive tuples of length n from input iterator.

    The last tuple may be shorter than n if it reaches the end of the iterator
    early.

    :param lst: Input iterator to chunk
    :param n: Desired length of output tuples
    :returns: Iterator of tuples of length n (except, possibly, the last tuple)
    """

    it = iter(lst)
    return iter(lambda: tuple(itertools.islice(it, n)), ())


def print_analysis_results(results, total_submissions):
    """
    Prints the anomalous results, one issue per line.

    The results object may not include enough information on its own to
    reconstruct the total number of submissions, so this is required as an
    argument to be able to print slightly more helpful messages.

    :param results: Results dict as returned by `get_analysis`
    :param total_submission: Integer number of total submissions
    :returns: None
    """

    num_rounds = get_distance(0, total_submissions - 1) + 1
    print(f"Analysis results:")
    for round, round_results in sorted(results.items()):
        # We only record problems, so this should never come up
        if not round_results:
            print(f"Round {round} / {num_rounds} | No issues found")
            continue

      
        if "submitters" in round_results:
            for submitter, submission_groups in round_results["submitters"].items():
                for group_number, group in submission_groups.items():
                    num_groups = 2 ** (num_rounds - round)
                    print(f"Round {round} / {num_rounds} | Submitter {submitter} | Group {group_number} / {num_groups} | {' | '.join(map(str, group))}")

        if "artists" in round_results:
            for artist, submission_groups in round_results["artists"].items():
                for group_number, group in submission_groups.items():
                    num_groups = 2 ** (num_rounds - round)
                    print(f"Round {round} / {num_rounds} | Artist {artist} | Group {group_number} / {num_groups} | {' | '.join(map(str, group))}")

        if "seeds" in round_results:
            for match, submission_pair in round_results["seeds"].items():
                num_matches = 2 ** (num_rounds - round)
                print(f"Round {round} / {num_rounds} | Match {match} / {num_matches} | {submission_pair[0]} | {submission_pair[1]}")

        if "dupes" in round_results:
            for match, submission_pairs in round_results["dupes"].items():
                for submitter, submission in submission_pairs:
                    print(f"Round {round} / {num_rounds} | Duper {submitter} | Dupe {submission}")

        if "byes" in round_results:
            for match, submission_pair in round_results["byes"].items():
                if match == "totals":
                    # In this case, we have recorded information about total
                    # numbers of seeds in a dict so "submission_pair" isn't
                    # accurate
                    for seed, counts in submission_pair.items():
                        print(f"Round {round} / {num_rounds} | Bye Totals | Seed {seed} | Expected {counts[0]} | Actual {counts[1]}")
                else:
                    num_matches = 2 ** (num_rounds - round)
                    print(f"Round {round} / {num_rounds} | Bye Match {match} / {num_matches} | {submission_pair[0]} | {submission_pair[1]}")

    if not results:
        print(f"No problems found")


def print_analysis(seeds, submissions):
    """
    Calculate and then print the distribution analysis for the given seeding.

    :param seeds: Seed order to analyze
    :param submissions: List of `Submission` instances to sort
    :returns: None
    """
    print_analysis_results(get_analysis(seeds, submissions), len(submissions))


def get_canonical_artist(artist):
    """
    Converts artist name string to canonical version, for comparison.

    This performs the following operations, in order:
        - lowercases the input string
        - replaces double hyphens with a space
        - strips diacritics and many other miscellaneous marks (like ``&``)
        - collapses multiple spaces in a row to a single space
        - strips leading "The"
        - drops featured artists from the end of the artist name by looking for:
            - ``ft``, ``feat``, or ``featuring``
            - optional period after the two abbreviations
            - optional parentheses around the whole thing
            - must have something following the "featuring" introduction, strips
              to the end of the artist name

    :param artist: String artist name
    :returns: Canonical artist name, suitable for comparison
    """

    def should_keep(c):
        return unicodedata.category(c)[0] in {"L", "N", "S", "Z"}

    return re.sub(
        r" (\()?(?:f(?:ea)?t\.?|featuring) .+(?(1)\))$",
        "",
        re.sub(
            r"^the ",
            "",
            re.sub(
                r"\s+",
                " ",
                "".join(
                    filter(
                        should_keep,
                        unicodedata.normalize(
                            "NFKD",
                            artist.lower().replace("--", " "),
                        ),
                    ),
                ),
            ),
        ),
    )


def get_canonical_submitter(submitter):
    return submitter.lower()


class Submission:
    """
    Container class for an individual submission
    """

    def __init__(self, *, artist, song, submitter, seed, slot=None, q=None, is_bye=False, **kwargs):
        """
        Constructor for a `Submission` instance.

        Requires the following keyword-only arguments:
            - ``artist``
            - ``song``
            - ``submitter``
            - ``seed``
        Any additional keyword arguments will be ignored.

        :param artist: The string name of the artist who performed/composed the
            song
        :param song: The string title of the song
        :param submitter: The string handle of the user who submitted the song
        :param seed: The 1-indexed seed position within the submitter's list, 0
            indicates a song was submitted by other users as well
        """

        self.is_bye = is_bye
        self.artist = artist
        self.artist_cmp = get_canonical_artist(artist)
        self.song = song
        self.submitter = submitter
        # Ideally we would go by submitter ID
        # but this should be good enough for now
        self.submitter_cmp = get_canonical_submitter(submitter)
        self.seed = int(seed)
        self.slot = slot
        self.q = q
        if "dupers" in kwargs:
            self.dupers = kwargs["dupers"]
        else:
            submitters = kwargs.get("submitters")
            if submitters:
                if isinstance(submitters, str):
                    submitters = map(str.strip, submitters.split(";"))
                submitters = set(map(str.lower, submitters)) - {self.submitter_cmp}
            else:
                # Could be blank ("") or not given at all (None)
                submitters = set()
            self.dupers = submitters

    def __str__(self):
        """
        Pretty way of converting the submission to a string.

        Includes the artist, song, submitter, and submitted seed values.
        """

        slot = "" if self.slot is None else f"{self.slot} "
        if self.is_bye:
            return f"{slot}Bye"
        else:
            dupers = f" [{', '.join(sorted(self.dupers))}]" if self.dupers else ""
            return f"{slot}{self.artist} - {self.song} <{self.submitter}, {self.seed}{dupers}>"

    @classmethod
    def Bye(cls, *, slot=None, **kwargs):
        """
        Returns a dummy instance indicating that a slot's opponent gets a bye.
        """

        # Use UUID for artist and submitter as a hack so they won't count
        # against us during analysis
        bye = cls(
            artist=uuid.uuid4().hex,
            song="",
            submitter=uuid.uuid4().hex,
            seed=6,
            slot=slot,
            is_bye=True,
            **kwargs,
        )
        return bye

    @classmethod
    def copy(cls, instance, **overrides):
        kwargs = instance.__dict__.copy()
        kwargs.update(overrides)
        return cls(**kwargs)


def calc_badness(i, submissions):
    """
    Calculates the badness for the submission at the given index.

    Adds the badness from comparing the given submission to each of the
    submissions that come after it in the list and returns the sum total.

    :param i: Index of the current submission within the ``submissions`` list
    :param submissions: List of all song submissions, in seeded order
    :returns: Total badness of the given song within the current list
    """

    n = len(submissions)
    badness = [0] * n

    # The final submission always has perfect badness since nothing comes after
    if i == n - 1:
        return badness

    # Byes don't generate any badness on their own
    # Only real submissions matched against a bye should generate badness here
    if submissions[i].is_bye:
        return badness

    # Include some badness for matching low seeds to other low
    # seeds in the first round only
    if i % 2 == 0:
        if submissions[i + 1].is_bye:
            # We want the lowest (closest to 0) seeds possible to get byes
            # We use sqrt here so that it gets badder faster as you get farther
            # away from 0
            badness[i + 1] += math.sqrt(
                submissions[i].seed / submissions[i + 1].seed
            ) * BADNESS_MAX_SEED
        else:
            badness[i + 1] += (
                abs(3 - 0.5 * (submissions[i].seed + submissions[i + 1].seed))
                * (13 - submissions[i].seed - submissions[i + 1].seed)
            ) * BADNESS_MAX_SEED / 39

    # We'd also like to not have 0 or 1 seeds meet up r2, give a little badness there
    if (i // 2) % 2 == 0 and submissions[i].seed in {0, 1}:
        j_start = i + 2 - (i % 2)
        for j in range(j_start, j_start + 2):
            if submissions[j].seed in {0, 1}:
                # A 0-seed here with two 0-seeds in the next couple slots would
                # give us half BADNESS_MAX_SEED total. More likely we'll only
                # add one quarter of BADNESS_MAX_SEED at the most. A 1-seed vs a
                # 1-seed here earns one eighth of BADNESS_MAX_SEED.
                badness[j] += (4 - submissions[i].seed - submissions[j].seed) * BADNESS_MAX_SEED / 16

    max_distance = math.floor(math.log2(n))
    for j in range(i + 1, n):
        # Calculate the number of rounds before these two submissions would meet
        # in a match, starting with 0 if they already are
        distance = get_distance(i, j)
        distance_factor = (1 - distance / max_distance)
        if submissions[i].artist_cmp == submissions[j].artist_cmp:
            badness[j] += BADNESS_MAX_ARTIST * distance_factor
        if submissions[i].submitter_cmp == submissions[j].submitter_cmp:
            badness[j] += BADNESS_MAX_SUBMITTER * distance_factor
        elif submissions[i].submitter_cmp in submissions[j].dupers:
            # We'll still try to space this out some but scale it down based on
            # number of dupes/dupers
            duper_factor = 1 / min(
                # Both of these should have a minimum value of 1 here
                len(submissions[j].dupers),
                get_number_of_dupes(submissions[i].submitter_cmp, submissions),
            )
            badness[j] += BADNESS_MAX_DUPER * duper_factor * distance_factor
    # We've collected all the same badness in other slots, add here as well
    # This gives us twice the score we want but is evenly distributed
    badness[i] = sum(badness)
    return badness


# This is expensive so we want to cache the results, but we can use an unbounded
# cache because we don't know the number of submissions here but we do know that
# it won't be too big
def get_number_of_dupes(submitter, submissions):
    """
    For the submitter, returns the number of songs they submitted but don't own.
    """

    # We have to wrap this so that ``submissions`` remains in the scope of the
    # wrapped function and the cache only looks at the ``submitter`` argument
    @functools.lru_cache(maxsize=None)
    def _get_number_of_dupes(submitter):
        return sum(1 for submission in submissions if submitter in submission.dupers)

    return _get_number_of_dupes(submitter)


def get_badness(seeds, submissions):
    """
    Returns a list of the badness scores for corresponding submissions

    :param seeds: Seed order to sort submissions by
    :param submissions: List of `Submission` instances
    :returns: List of badness scores corresponding to each submission in the
        original order
    """

    ordered_submissions = [submissions[i] for i in seeds]
    return [
        sum(lst)
        for lst in zip(
            *(
                calc_badness(i, ordered_submissions)
                for i in range(len(ordered_submissions))
            )
        )
    ]


def get_rand_index(n, exclude=None, has_byes=False):
    """
    Return a random integer in range(n), given constraints.
    
    The ``exclude`` parameter excludes a single integer value. The ``has_byes``
    parameter indicates that every fourth integer should be skipped as those are
    occupied by bye slots.
    
    :param n: Integer max value to return (exclusive)
    :param exclude: Optional integer value to specifically exclude from output
    :param has_byes: Optional Boolean value indicating that every fourth integer
        should be disallowed
    :returns: Random integer that meets all the constraints specified
    """

    if has_byes:
        n *= 0.75
    if exclude is not None:
        n -= 1
    i = random.randrange(n)
    if exclude is not None:
        if has_byes:
            exclude -= exclude // 4
        if i >= exclude:
            i += 1
    if has_byes:
        i += i // 3
    return i


def swap(seeds, submissions, badness, use_max=True, hint=None, has_byes=False):
    """
    Try to decrease total badness by swapping a submission

    Will perform a single swap on the submission with the maximum badness (or a
    random one if use_max is ``False``), re-evaluate the badness, and return the
    new seed list if the total badness went down.

    :param seeds: Seed order to sort submissions by
    :param submissions: List of `Submission` instances
    :param badness: List of badness scores for submissions in seed order
    :param use_max: Boolean indicating whether to swap the submission with the
        maximum badness score, or just pick a random one (default True)
    :param hint: Optional integer index to try swapping with. If not given, swap
        with a random one instead
    :returns: Tuple of containing the list of badness scores and the list of
        seeds. May or may not be identical to the one originally passed in
    """

    n = len(submissions)

    if use_max:
        if has_byes:
            # Byes are in a fixed position, cannot be swapped
            # Give them 0 badness so they won't be picked with use_max
            valid_badness = [b if (i + 1) % 4 else 0 for i, b in enumerate(badness)]
        else:
            valid_badness = badness
        # Index within seeds of submission with the highest badness score
        i = valid_badness.index(max(valid_badness))
    else:
        # Hit a wall, use random starting point
        i = get_rand_index(n, has_byes=has_byes)
    if hint is not None and hint != i and (not has_byes or (hint + 1) % 4):
        j = hint
    else:
        # Random choice to swap with
        j = get_rand_index(n, exclude=i, has_byes=has_byes)

    seeds[i], seeds[j] = seeds[j], seeds[i]
    new_badness = get_badness(seeds, submissions)
    if sum(new_badness) < sum(badness):
        return new_badness, seeds
    else:
        seeds[i], seeds[j] = seeds[j], seeds[i]
        return badness, seeds


def get_new_seeds(submissions):
    """
    Generate a new seeding order.

    Given a list of submissions, generates a new seed ordering for the
    submissions and calculates the initial badness for each corresponding
    element in the seed list, returning the badness and seed lists in a tuple.

    This is mostly used as an internal convenience function.

    :param submissions: List of `Submission` instances
    :returns: Tuple containing a list of badness scores and a list of seeds
    """

    if submissions[-1].is_bye:
        # Ignore byes when shuffling, we'll insert them all afterward
        n = len([submission for submission in submissions if not submission.is_bye])
    else:
        n = len(submissions)
    seeds = get_shuffled_range(n)
    if submissions[-1].is_bye:
        # Every fourth submission should be a bye
        # The bye submissions are all at the end, so adding n to a 0-based index
        # will give a bye submission index
        seeds = list(
            itertools.chain.from_iterable(
                trio + (i + n,) for i, trio in enumerate(chunk(seeds, 3))
            )
        )
    badness = get_badness(seeds, submissions)
    return badness, seeds


def get_shuffled_range(n):
    """
    Utility function to generate a random ordering of the integers in [0, n)

    :param n: The length of the returned list
    :returns: A list of the numbers from 0 to n-1, inclusive, shuffled
    """

    return random.sample(list(range(n)), k=n)


def get_hints(n, skip_byes=False):
    hints = get_shuffled_range(n)
    if skip_byes:
        return [j for i, j in enumerate(hints) if i % 4]
    else:
        return hints


def get_seed_order(data):
    """
    Given parsed CSV data, returns the seed slot of corresponding songs.

    :param data: List of dicts from the parsed CSV data
    :returns: List of seeding integers, indicating the final output order for
        the corresponding row in data. The input data list should be traversed
        in the order specified by the return value to obtain the match order
    """

    submissions = [Submission(**row) for row in data]
    has_byes = False

    if len(data) in {48, 96}:
        has_byes = True
        # Make dummy submissions at the end until we have an even power of two
        submissions += [
            Submission.Bye() for i in range(2 ** (math.floor(math.log2(len(data))) - 1))
        ]

    # Start completely randomly
    badness, seeds = get_new_seeds(submissions)
    n = len(submissions)
    prev_total = sum(badness)
    prev_i = 0
    attempts = 0
    best_badness = prev_total
    best_seeds = seeds.copy()
    hints = get_hints(n, has_byes)
    for i in range(ITERATIONS):
        if hints:
            use_max = True
            hint = hints.pop()
        else:
            use_max = False
            hint = None
        badness, seeds = swap(seeds, submissions, badness, use_max=use_max, hint=hint, has_byes=has_byes)
        total_badness = sum(badness)
        if i % 100 == 0:
            print(f"Iteration {i} total badness {total_badness:.0f}")
        if total_badness < prev_total:
            prev_total = total_badness
            prev_i = i
            hints = get_hints(n, has_byes)
        if i - prev_i > ATTEMPT_ITERATIONS:
            attempts += 1
            if total_badness < best_badness:
                best_badness = total_badness
                best_seeds = seeds.copy()
            # We've tried enough for now
            if attempts > ATTEMPTS:
                print(f"Iteration {i} max attempts, quitting")
                break
            # Otherwise, start over
            badness, seeds = get_new_seeds(submissions)
            prev_total = sum(badness)
            prev_i = i
            hints = get_hints(n, has_byes)
            print(f"Iteration {i} new attempt, new badness {prev_total:.0f}")
            continue
    else:
        if total_badness < best_badness:
            best_badness = total_badness
            best_seeds = seeds.copy()

    print(f"Done trying, best badness {best_badness:.0f}")
    badness = get_badness(best_seeds, submissions)
    [print(f"{i:2} {badness[i]:3.0f} {submissions[best_seeds[i]]}") for i in range(n)]

    print_analysis(best_seeds, submissions)

    if submissions[-1].is_bye:
        # Now we need to drop the byes before returning
        best_seeds = [i for i in best_seeds if i < len(data)]

    return best_seeds


def get_parser():
    """
    Creates and return the ArgumentParser for the script.

    :returns: Instantiated and fully configured instance of ArgumentParser
    """

    parser = argparse.ArgumentParser(
        description="create a seeding order for input CSV",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        usage=f"{os.path.basename(__file__ or 'seed.py')} [OPTIONS] INPUT [OUTPUT]",
    )

    parser.add_argument(
        "INPUT",
        help=(
            "path to the input CSV. If given the special value `-`, instead "
            "reads input from STDIN"
        ),
    )
    parser.add_argument(
        "OUTPUT",
        help=(
            "desired path to the output CSV file. If not given, defaults to "
            "printing to STDOUT. If file exists or intermediate directories do "
            "not, operation will fail (and output will be directed to STDOUT), "
            "unless the `--force` flag is specified"
        ),
        nargs="?",
    )
    parser.add_argument(
        "--force",
        "-f",
        help=(
            "force output to the given file path, overwriting contents if the "
            "file already exists and creating any intermediate directories, if "
            "necessary"
        ),
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--drop-dupes-first",
        help=(
            "prioritize dropping songs submitted by people with more dupes "
            "first"
        ),
        action="store_true",
        default=False,
    )

    group = parser.add_argument_group(
        title="output arguments",
        description="Configure output CSV formatting",
    )
    group.add_argument(
        "--output-csv-tabs",
        help="use a tab delimiter when outputting the CSV data",
        action="store_true",
        default=False,
    )
    group.add_argument(
        "--output-order",
        help=(
            "the order to sort and/or transform the output seeding by. For "
            "`sorted`, submissions are sorted by the new seeding order. For "
            "`original`, submissions retain their original positioning within "
            "the input data. For `bracket`, the generated seeding order is "
            "transformed so that when the spreadsheet creates matches it'll end "
            "up with them in the proposed ordering. Output order is the same as "
            "the input data."
        ),
        choices=["sorted", "original", "bracket"],
        default="sorted",
    )
    group.add_argument(
        "--output-dropped",
        help=(
            "include dropped songs in the output CSV data. Dropped rows will "
            "have an empty value for the new seed position. In `sorted` output "
            "order, dropped submissions will be at the end."
        ),
        action="store_true",
        default=False,
    )

    group = parser.add_argument_group(
        title="behavioral arguments",
        description=(
            "The following arguments configure how many iterations to try and "
            "how to calculate the badness score"
        ),
    )
    group.add_argument(
        "--badness-artist",
        help="how much to weigh duplicate artists when calculating badness",
        default=BADNESS_MAX_ARTIST,
        type=int,
    )
    group.add_argument(
        "--badness-submitter",
        help="how much to weigh duplicate submitters when calculating badness",
        default=BADNESS_MAX_SUBMITTER,
        type=int,
    )
    group.add_argument(
        "--badness-seed",
        help="how much to weigh first round seed matchups when calculating badness",
        default=BADNESS_MAX_SEED,
        type=int,
    )
    group.add_argument(
        "--badness-duper",
        help="how much to weigh duper collisions",
        default=BADNESS_MAX_SEED,
        type=int,
    )
    group.add_argument(
        "--iterations",
        help="total number of iterations to run",
        default=ITERATIONS,
        type=int,
    )
    group.add_argument(
        "--attempts",
        help="maximum number of attempts to reshuffle",
        default=ATTEMPTS,
        type=int,
    )
    group.add_argument(
        "--attempt-iterations",
        help=(
            "number of iterations without a decrease in badness before starting "
            "a new attempt"
        ),
        default=ATTEMPT_ITERATIONS,
        type=int,
    )

    return parser


def read_csv_from_file(file):
    """
    Reads the CSV data from the open file handle and returns a list of dicts.

    Assumes the CSV data includes a header row and uses that header row as
    fieldnames in the dict. The following fields are required and are
    case-sensitive:
        - ``artist``
        - ``song``
        - ``submitter``
        - ``seed``
    Other fields are ultimately preserved untouched in the output CSV.

    If the CSV doesn't have a header row, uses the following hardcoded list:
        - ``order``
        - ``seed``
        - ``submitter``
        - ``year``
        - ``song``
        - ``artist``
        - ``link``
        - ``submitters``

    If a tab character is present in the first row, assumes the data is
    tab-delimited, otherwise assumes comma-delimited.

    :returns: All parsed data from the already-opened CSV file given, as a list
        of dicts as generated by `csv.DictReader`
    """

    data = list(file)
    delimiter = "\t" if "\t" in data[0] else ","
    # Look for a header row
    reader = csv.reader([data[0]], delimiter=delimiter)
    row = next(reader)
    for col in row:
        try:
            int(col)
            # Found an integer, no headers present
            headers = ["order", "seed", "submitter", "year", "song", "artist", "link", "submitters"]
            break
        except ValueError:
            pass
    else:
        # Unable to find an integer here, must be a header row
        # Pop the header row off the data list and create a new reader just to
        # parse that row
        data.pop(0)
        headers = row
    return list(csv.DictReader(data, fieldnames=headers, delimiter=delimiter))


def get_csv_data(csv_path):
    """
    Given a path to a CSV file (or ``"-"``), returns the parsed data.

    :param csv_path: Path to the CSV input file, or ``"-"`` for STDIN
    :returns: Parsed CSV data as a list of dicts

    .. seealso:: `read_csv_from_file` for more details regarding the specific
        output format and required columns
    """

    if csv_path == '-':
        data = read_csv_from_file(sys.stdin)
    else:
        with open(csv_path, newline='') as csv_file:
            data = read_csv_from_file(csv_file)
    return data


def get_submission_counts(rows):
    submissions = [Submission(**row) for row in rows]
    counts = collections.Counter()
    for submission in submissions:
        counts[submission.submitter_cmp] += 1
        counts.update(submission.dupers)
    return counts


def choose_submissions(data, drop_dupes_first=False):
    """
    Creates a power of two bracket by randomly eliminating larger seed songs

    Creates a copy of the input list and then, for the submissions with larger
    seed numbers, randomly eliminates them until the length of the list is an
    even power of two.

    As a special case, if there are 96 or more songs but not enough for a 128
    bracket, it'll return 96 submissions. When creating the seeds, every fourth
    submissions will need to be populated with dummy bye submissions. Similarly,
    it will return 48 submissions if there are not enough for a 64 bracket.

    Returns a tuple containing both the new data and a list of what was removed.
    The dropped list contains tuple with the index of the dropped data in the
    original list as well as the data itself.

    :param data: List of dicts from the input CSV
    :param drop_dupes_first: Optional Boolean indicating whether to prioritize
        dropping songs by submitters who have more dupes first [default: False]
    :returns: A tuple with a new list with a number of elements that is a power
        of two and another list containing tuples with the original index and
        the dropped data for all removed rows
    """

    dropped = []
    if 96 <= len(data) < 128:
        target_size = 96
    elif 48 <= len(data) < 64:
        target_size = 48
    else:
        target_size = 2 ** math.floor(math.log2(len(data)))

    new_data = data.copy()

    while len(new_data) > target_size:
        target_seed = max(row["seed"] for row in new_data)
        choices = [row for row in new_data if row["seed"] == target_seed]
        if drop_dupes_first:
            # Further filter choices list to only be submissions from people
            # tied for having the most songs counting dupes
            counts = get_submission_counts(new_data)
            # We have to filter the counts to only submitters we're considering
            # eliminating
            submitters = {get_canonical_submitter(row["submitter"]) for row in choices}
            counts = [submitter_count for submitter_count in counts.most_common() if submitter_count[0] in submitters]
            # Whatever is left is already sorted by submission count
            max_count = counts[0][1]
            most_submissions = {submitter for submitter, count in counts if count == max_count}
            choices = [row for row in choices if get_canonical_submitter(row["submitter"]) in most_submissions]
            print(f"Found {len(choices)} songs by submitters with {max_count} submissions")
        to_remove = random.choice(choices)
        print(f"Eliminating submission {Submission(**to_remove)}")
        dropped.append((data.index(to_remove), len(new_data), to_remove))
        new_data.remove(to_remove)
    print(
        f"Eliminated {len(data) - len(new_data)} submissions for a "
        f"{len(new_data)} bracket"
    )
    # Sort `dropped` list by original index (the first element in each tuple)
    return new_data, sorted(dropped)


def output_seeded_csv(file, seeds, data, use_tabs, order, dropped):
    """
    Given an open file, seed list, and input CSV data, writes data as a CSV.

    Any open file or file-like handle can be given, the input data will be
    sorted according to the order specified in the seed list (as returned by
    `get_seed_order`).

    :param file: Open file or file-like handle
    :param seeds: List of integers to sort data by
    :param data: List of dicts parsed from the input CSV rows, to be written in
        the order specified by ``seeds``. Column ordering should be preserved
        from the input data
    :returns: None
    """

    delimiter = "\t" if use_tabs else ","
    quoting = csv.QUOTE_NONE if use_tabs else csv.QUOTE_MINIMAL

    if order == "bracket" and len(seeds) not in ORDERS:
        print(
            f"ERROR Bracket ordering requested but no ordering defined for a "
            f"{len(seeds)} bracket, using `original`"
        )
        order = "original"

    print(f"Writing CSV in {order} order")
    writer = csv.writer(file, delimiter=delimiter, quoting=quoting)
    # Write header row first
    writer.writerow(["new_order"] + list(data[0].keys()))

    if order == "sorted":
        ordered_data = (
            [i + 1] + list(data[j].values())
            for i, j in enumerate(seeds)
        )
    elif order == "original":
        # Invert the seeding list so we can iterate in original order
        original_seeds = [None] * len(seeds)
        for i, j in enumerate(seeds):
            original_seeds[j] = i
        ordered_data = (
            [original_seeds[i] + 1] + list(row.values())
            for i, row in enumerate(data)
        )
    elif order == "bracket":
        # Invert the seeding list so we can iterate in original order
        original_seeds = [None] * len(seeds)
        for i, j in enumerate(seeds):
            original_seeds[j] = i
        # Now transform these values to fit the traversal order hardcoded into
        # the spreadsheet
        bracket_order = ORDERS[len(seeds)]
        ordered_data = (
            [bracket_order[original_seeds[i]]] + list(row.values())
            for i, row in enumerate(data)
        )

    if dropped:
        if order == "sorted":
            # Put the dropped stuff at the end, in original index order
            ordered_data = itertools.chain(ordered_data, ([seed] + list(row.values()) for i, seed, row in dropped))
        else:
            # Interleave the dropped rows into the rest of the data
            # Cast to a list so we can slice
            seeded_data = list(ordered_data)
            # Start this over and rebuild the list from scratch
            ordered_data = []
            prev_i = 0
            for i, seed, row in dropped:
                ordered_data += seeded_data[prev_i:i] + [[seed] + list(row.values())]
                prev_i = i
            else:
                # `i` will still be whatever the last value was
                ordered_data += seeded_data[i:]

    writer.writerows(ordered_data)


def write_csv_data(csv_path, force, seeds, data, use_tabs, use_bracket_order, dropped):
    """
    Given an output path and force flag, sorts data by seeds and writes it.

    :param csv_path: Path to the desired output file, or ``None`` for STDOUT
    :param force: Boolean flag indicated whether to overwrite existing files and
        create intermediate directories in the path
    :param seeds: List of integers to sort data by
    :param data: List of dicts parsed from the input CSV rows
    :returns: None

    .. seealso:: `output_seeded_csv` for more details on the specific output
        format
    """

    if csv_path is None:
        return output_seeded_csv(sys.stdout, seeds, data, use_tabs, use_bracket_order, dropped)

    if force:
        dirs = os.path.dirname(csv_path)
        if dirs:
            os.makedirs(dirs, exist_ok=True)

    mode = "w" if force else "x"

    with open(csv_path, mode, newline="") as csv_file:
        return output_seeded_csv(csv_file, seeds, data, use_tabs, use_bracket_order, dropped)


def main(
    input_csv_path,
    output_csv_path,
    force_output,
    output_csv_tabs,
    output_bracket_order,
    output_dropped,
    drop_dupes_first,
):
    """
    Main entry point for the script.

    Given the arguments parsed from the command line, performs the requested
    operations, including writing output to the specified file.

    :param input_csv_path: Path to input CSV file, or ``"-"`` for STDIN
    :param output_csv_path: Path to output CSV file, or ``None`` for STDOUT
    :param force_output: If output file already exists overwrite it, if
        intermediate directories on the path do not exist, create them
    :param drop_dupes_first: Prioritize dropping songs by submitters with dupes
    :returns: None
    """

    data = get_csv_data(input_csv_path)
    data, dropped = choose_submissions(data, drop_dupes_first)
    seeds = get_seed_order(data)
    write_csv_data(
        output_csv_path,
        force_output,
        seeds,
        data,
        output_csv_tabs,
        output_bracket_order,
        dropped if output_dropped else None,
    )


if __name__ == "__main__":
    if TESTING is False:
        parser = get_parser()
        args = parser.parse_args()
        input_csv_path =  args.INPUT
        output_csv_path = args.OUTPUT
        force_output = args.force
        drop_dupes_first = args.drop_dupes_first

        output_csv_tabs = args.output_csv_tabs
        output_order = args.output_order
        output_dropped = args.output_dropped

        # Reset variables with anything passed in on the command line
        BADNESS_MAX_ARTIST = args.badness_artist
        BADNESS_MAX_SUBMITTER = args.badness_submitter
        BADNESS_MAX_SEED = args.badness_seed
        BADNESS_MAX_DUPER = args.badness_duper
        ITERATIONS = args.iterations
        ATTEMPTS = args.attempts
        ATTEMPT_ITERATIONS = args.attempt_iterations
    else:
        input_csv_path =  'seeding/new-sample.csv'
        output_csv_path = 'seeding/test_output.csv'
        force_output = True
        drop_dupes_first = True

        output_csv_tabs = True
        output_order = 'bracket'
        output_dropped = True

        # Reset variables with anything passed in on the command line
        BADNESS_MAX_ARTIST = 20
        BADNESS_MAX_SUBMITTER = 100
        BADNESS_MAX_SEED = 100
        BADNESS_MAX_DUPER = 20
        ITERATIONS = 15000
        ATTEMPTS = 1
        ATTEMPT_ITERATIONS = 1

    main(
        input_csv_path,
        output_csv_path,
        force_output,
        output_csv_tabs,
        output_order,
        output_dropped,
        drop_dupes_first,
    )
