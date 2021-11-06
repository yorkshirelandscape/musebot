#! /bin/env python3

import argparse
import collections
import csv
import itertools
import math
import operator
import os
import random
import re
import sys


# Default values for these settings
# May be modified by command line arguments
BADNESS_MAX_ARTIST = 20
BADNESS_MAX_SUBMITTER = 50
BADNESS_MAX_SEED = 100
ITERATIONS = 10000
ATTEMPTS = 10
ATTEMPT_ITERATIONS = 200


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

    ordered_submissions = [Submission.copy(submissions[j], slot=i) for i, j in enumerate(seeds)]
    results = collections.defaultdict(lambda: collections.defaultdict(dict))
    max_round = get_distance(0, len(seeds) - 1) + 1

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

    # Special case to list any {0, 1} vs. {0, 1} matches in the first round
    # This magic grabs two elements from ordered_submissions at a time
    it = iter(ordered_submissions)
    match = 0
    for submission1, submission2 in iter(lambda: tuple(itertools.islice(it, 2)), ()):
        match += 1
        if submission1.seed in {0, 1} and submission2.seed in {0, 1}:
            results[1]["seeds"][match] = (submission1, submission2)

    return results


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
    else:
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
        - strips remaining hyphens
        - replaces all other sequences of non-alphanumeric characters with spaces
        - strips leading "The"

    :param artist: String artist name
    :returns: Canonical artist name, suitable for comparison
    """

    return re.sub(
        r"^the ",
        "",
        re.sub(
            r"[\W_]+",
            " ",
            artist.lower().replace("--", " ").replace("-", ""),
        ),
    )


class Submission:
    """
    Container class for an individual submission
    """

    def __init__(self, *, artist, song, submitter, seed, slot=None, **kwargs):
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

        self.artist = artist
        self.artist_cmp = get_canonical_artist(artist)
        self.song = song
        self.submitter = submitter
        # Ideally we would go by submitter ID
        # but this should be good enough for now
        self.submitter_cmp = submitter.lower()
        self.seed = int(seed)
        self.slot = slot

    def __str__(self):
        """
        Pretty way of converting the submission to a string.

        Includes the artist, song, submitter, and submitted seed values.
        """

        slot = "" if self.slot is None else f"{self.slot} "
        return f"{slot}{self.artist} - {self.song} <{self.submitter}, {self.seed}>"

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

    # Include some badness for matching low seeds to other low
    # seeds in the first round only
    if i % 2 == 0:
        badness[i + 1] += (
            abs(3 - 0.5 * (submissions[i].seed + submissions[i + 1].seed))
            * (13 - submissions[i].seed - submissions[i + 1].seed)
        ) * BADNESS_MAX_SEED / 39

    max_distance = math.floor(math.log2(n))
    for j in range(i + 1, n):
        # Calculate the number of rounds before these two submissions would meet
        # in a match, starting with 0 if they already are
        distance = get_distance(i, j)
        if submissions[i].artist_cmp == submissions[j].artist_cmp:
            badness[j] += BADNESS_MAX_ARTIST * (1 - distance / max_distance)
        if submissions[i].submitter_cmp == submissions[j].submitter_cmp:
            badness[j] += BADNESS_MAX_SUBMITTER * (1 - distance / max_distance)
    # We've collected all the same badness in other slots, add here as well
    # This gives us twice the score we want but is evenly distributed
    badness[i] = sum(badness)
    return badness


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


def swap(seeds, submissions, badness, use_max=True, hint=None):
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

    if use_max:
        # Index within seeds of submission with the highest badness score
        i = badness.index(max(badness))
    else:
        # Hit a wall, use random starting point
        i = random.randrange(0, len(submissions))
    if hint and hint != i:
        j = hint
    else:
        # Random choice to swap with
        # Use a smaller range so that...
        j = random.randrange(0, len(submissions) - 1)
        # ...we make sure we don't pick i
        if j >= i:
            j += 1
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
    seeds = get_shuffled_range(len(submissions))
    badness = get_badness(seeds, submissions)
    return badness, seeds


def get_shuffled_range(n):
    """
    Utility function to generate a random ordering of the integers in [0, n)

    :param n: The length of the returned list
    :returns: A list of the numbers from 0 to n-1, inclusive, shuffled
    """

    return random.sample(list(range(n)), k=n)


def get_seed_order(data):
    """
    Given parsed CSV data, returns the seed slot of corresponding songs.

    :param data: List of dicts from the parsed CSV data
    :returns: List of seeding integers, indicating the final output order for
        the corresponding row in data. The input data list should be traversed
        in the order specified by the return value to obtain the match order
    """

    submissions = [Submission(**row) for row in data]
    n = len(submissions)
    # Start completely randomly
    badness, seeds = get_new_seeds(submissions)
    prev_total = sum(badness)
    prev_i = 0
    attempts = 0
    best_badness = prev_total
    best_seeds = seeds.copy()
    hints = get_shuffled_range(n)
    for i in range(ITERATIONS):
        if hints:
            use_max = True
            hint = hints.pop()
        else:
            use_max = False
            hint = None
        badness, seeds = swap(seeds, submissions, badness, use_max=use_max, hint=hint)
        total_badness = sum(badness)
        if i % 100 == 0:
            print(f"Iteration {i} total badness {total_badness:.0f}")
        if total_badness < prev_total:
            prev_total = total_badness
            prev_i = i
            hints = get_shuffled_range(n)
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
            hints = get_shuffled_range(n)
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

    :returns: All parsed data from the already-opened CSV file given, as a list
        of dicts as generated by `csv.DictReader`
    """
    return list(csv.DictReader(file))


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


def choose_submissions(data):
    """
    Creates a power of two bracket by randomly eliminating larger seed songs

    Creates a copy of the input list and then, for the submissions with larger
    seed numbers, randomly eliminates them until the length of the list is an
    even power of two.

    :param data: List of dicts from the input CSV
    :returns: New list with a number of elements that is a power of two
    """

    target_size = 2 ** math.floor(math.log2(len(data)))
    new_data = data.copy()
    while len(new_data) > target_size:
        target_seed = max(row["seed"] for row in data)
        to_remove = random.choice(
            [row for row in data if row["seed"] == target_seed]
        )
        print(f"Eliminating submission {Submission(**to_remove)}")
        new_data.remove(to_remove)
    print(
        f"Eliminated {len(data) - len(new_data)} submissions for a "
        f"{len(new_data)} bracket"
    )
    return new_data


def output_seeded_csv(file, seeds, data):
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

    writer = csv.writer(file)
    # Write header row first
    writer.writerow(data[0].keys())
    writer.writerows(data[i].values() for i in seeds)


def write_csv_data(csv_path, force, seeds, data):
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
        return output_seeded_csv(sys.stdout, seeds, data)

    if force:
        dirs = os.path.dirname(csv_path)
        if dirs:
            os.makedirs(dirs, exist_ok=True)

    mode = "w" if force else "x"

    with open(csv_path, mode, newline="") as csv_file:
        return output_seeded_csv(csv_file, seeds, data)


def main(input_csv_path, output_csv_path=None, force_output=False):
    """
    Main entry point for the script.

    Given the arguments parsed from the command line, performs the requested
    operations, including writing output to the specified file.

    :param input_csv_path: Path to input CSV file, or ``"-"`` for STDIN
    :param output_csv_path: Path to output CSV file, or ``None`` for STDOUT
    :param force_output: If output file already exists overwrite it, if
        intermediate directories on the path do not exist, create them
    :returns: None
    """

    data = get_csv_data(input_csv_path)
    data = choose_submissions(data)
    seeds = get_seed_order(data)
    write_csv_data(output_csv_path, force_output, seeds, data)


if __name__ == "__main__":
    parser = get_parser()
    args = parser.parse_args()
    input_csv_path = args.INPUT
    output_csv_path = args.OUTPUT
    force_output = args.force

    # Reset variables with anything passed in on the command line
    BADNESS_MAX_ARTIST = args.badness_artist
    BADNESS_MAX_SUBMITTER = args.badness_submitter
    BADNESS_MAX_SEED = args.badness_seed
    ITERATIONS = args.iterations
    ATTEMPTS = args.attempts
    ATTEMPT_ITERATIONS = args.attempt_iterations

    main(input_csv_path, output_csv_path, force_output)
