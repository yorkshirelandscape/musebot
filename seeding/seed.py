#! /bin/env python3

import argparse
import csv
import math
import operator
import os
import random
import re
import sys


BADNESS_MAX_ARTIST = 20
BADNESS_MAX_SUBMITTER = 50
BADNESS_MAX_SEED = 100
ITERATIONS = 10000
ATTEMPTS = 10


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

    return re.sub(r"^the ", "", re.sub(r"[\W_]+", " ", artist.lower().replace("--", " ").replace("-", "")))


class Submission:
    """
    Container class for an individual submission
    """

    def __init__(self, *, artist, song, submitter, seed, **kwargs):
        """
        Constructor for a `Submission` instance.
        
        Requires the following keyword-only arguments:
            - ``artist``
            - ``song``
            - ``submitter``
            - ``seed``
        Any additional keyword arguments will be ignored.
        
        :param artist: The string name of the artist who performed/composed the song
        :param song: The string title of the song
        :param submitter: The string handle of the user who submitted the song
        :param seed: The 1-indexed seed position within the submitter's list, 0
            indicates a song was submitted by other users as well
        """

        self.artist = artist
        self.artist_cmp = get_canonical_artist(artist)
        self.song = song
        self.submitter = submitter
        # Ideally we would go by submitter ID, but this should be good enough for now
        self.submitter_cmp = submitter.lower()
        self.seed = int(seed)

    def __str__(self):
        return f"{self.artist} - {self.song} <{self.submitter}, {self.seed}>"


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
        # in a match, starting with 1 if they already are
        # The `+ 1` is to avoid division by zero
        distance = math.floor(math.log2(i ^ j)) + 1
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

    Will perform a single swap on the , re-evaluate the badness, and return the new seed
    list if the total badness went down.

    :param seeds: Seed order to sort submissions by
    :param submissions: List of `Submission` instances
    :param badness: List of badness scores for submissions in seed order
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
    seeds = get_shuffled_range(len(submissions))
    badness = get_badness(seeds, submissions)
    return badness, seeds


def get_shuffled_range(n):
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
        if i - prev_i > 200:
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
    return best_seeds


def get_parser():
    """
    Creates and return the ArgumentParser for the script.

    :returns: Instantiated and fully configured instance of ArgumentParser
    """

    parser = argparse.ArgumentParser(description="create a seeding order for input CSV")
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
        to_remove = random.choice([row for row in data if row["seed"] == target_seed])
        print(f"Eliminating submission {Submission(**to_remove)}")
        new_data.remove(to_remove)
    print(f"Eliminated {len(data) - len(new_data)} submissions for a {len(new_data)} bracket")
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
    main(input_csv_path, output_csv_path, force_output)
