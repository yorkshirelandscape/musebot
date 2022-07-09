import itertools
import collections
import math
import operator

import utils
from submission import Submission

__all__ = (
    "print_analysis",
)


def get_quarter_counts(submissions):
    counts = collections.defaultdict(collections.Counter)
    for submission in submissions:
        counts[submission.submitter][submission.q] += 1
    return counts


def print_quarter_counts(counts):
    for submitter, quarters in sorted(counts.items()):
        print("{:<15}".format(submitter), *(quarters[q] for q in range(4)), sep="\t")


def get_analysis(seeds, data):
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

    :param seeds: Seed order to analyze. Should not include seeds for bye rows
    :param data: List of data rows to analyze
    :returns: The data structure described above, which may be an empty dict
    """

    # If this already *does* include bye seeds, it should be a no-op anyway
    # since it would then be an even power of two
    seeds = utils.insert_byes(seeds)

    bracket_size = len(data)
    submissions = Submission.get_ordered_submissions(seeds, data)
    total_submissions = len(submissions)
    results = collections.defaultdict(lambda: collections.defaultdict(dict))
    max_round = utils.get_number_of_rounds(total_submissions)

    # Store this here since we know it and then won't have to pass it around separately
    results["num_rounds"] = max_round

    def get_keyfunc(round):
        return lambda x: x // (2 ** round)

    for key, attr in [("submitters", "submitter_cmp"), ("artists", "artist_cmp")]:
        vals = {getattr(submission, attr) for submission in submissions}
        for val in vals:
            # The positions of all the relevant songs
            slots = [
                i
                for i, submission in enumerate(submissions)
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
                    k: tuple(submissions[i] for i in g)
                    for k, g in groups.items()
                    if len(g) not in allowed_sizes
                }

    # Special case to list specific collisions in the first round:
    # - {0, 1} vs. {0, 1}
    # - submitter vs dupe
    match = 0
    for submission1, submission2 in utils.chunk(submissions, 2):
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
    for submissions_chunk in utils.chunk(submissions, 4):
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
    if utils.has_byes(bracket_size):
        allowed_seeds = [
            submission.seed
            for submission in sorted(submissions, key=operator.attrgetter("seed"))
        ][:int(total_submissions / 4)]
        max_allowed_seed = max(allowed_seeds)
        match = 0
        for submission1, submission2 in utils.chunk(submissions, 2):
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
            actual_seeds = sorted(submissions[i].seed for i in range(2, total_submissions, 4))
            if allowed_seeds != actual_seeds:
                # We have a problem, count up each seed and record any disparities
                allowed_counts = collections.Counter(allowed_seeds)
                actual_counts = collections.Counter(actual_seeds)
                results[1]["byes"]["totals"] = {}
                for k in set(allowed_counts) | set(actual_counts):
                    if allowed_counts[k] != actual_counts[k]:
                        results[1]["byes"]["totals"][k] = (allowed_counts[k], actual_counts[k])

    results["quarters"] = get_quarter_counts(submissions)

    return results


def print_analysis_results(results):
    """
    Prints the anomalous results, one issue per line.

    :param results: Results dict as returned by `get_analysis`
    :returns: None
    """

    # We stuck this on here just so we wouldn't have to pass it as a separate argument
    num_rounds = results.pop("num_rounds")

    print(f"Analysis results:")

    # Remove this element from results so we don't throw off the per-round setup
    # of the rest of results
    quarter_counts = results.pop("quarters")
    print_quarter_counts(quarter_counts)

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


def print_analysis(seeds, data):
    """
    Calculate and then print the distribution analysis for the given seeding.

    :param seeds: Seed order to analyze
    :param data: List of data rows to report on
    :returns: None
    """

    print_analysis_results(get_analysis(seeds, data))
