#! /bin/env python3

import argparse
import collections
import functools
import itertools
import math
import os
import random
import time

import analysis
import csv_tools
import utils
from submission import Submission

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
        distance = utils.get_distance(i, j)
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

    # If there are no byes, insert_byes won't do anything anyway
    seeds = utils.insert_byes(utils.get_shuffled_range(n))
    badness = get_badness(seeds, submissions)
    return badness, seeds


def get_hints(n, skip_byes=False):
    hints = utils.get_shuffled_range(n)
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

    submissions = Submission.get_submissions(data)
    has_byes = utils.has_byes(len(data))

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

    if has_byes:
        # Now we need to drop the byes before returning
        best_seeds = [i for i in best_seeds if i < len(data)]

    return best_seeds


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

    size = len(data)
    dropped = []
    target_size = utils.get_bracket_size(size)
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
            submitters = {utils.get_canonical_submitter(row["submitter"]) for row in choices}
            counts = [submitter_count for submitter_count in counts.most_common() if submitter_count[0] in submitters]
            # Whatever is left is already sorted by submission count
            max_count = counts[0][1]
            most_submissions = {submitter for submitter, count in counts if count == max_count}
            choices = [row for row in choices if utils.get_canonical_submitter(row["submitter"]) in most_submissions]
            print(f"Found {len(choices)} songs by submitters with {max_count} submissions")
        to_remove = random.choice(choices)
        print(f"Eliminating submission {Submission(**to_remove)}")
        dropped.append((data.index(to_remove), len(new_data), to_remove))
        new_data.remove(to_remove)
    print(
        f"Eliminated {size - len(new_data)} submissions for a "
        f"{len(new_data)} bracket"
    )
    # Sort `dropped` list by original index (the first element in each tuple)
    return new_data, sorted(dropped)


def seed_rng(seed):
    if seed is None:
        seed = int(time.time())
        print(f"No seed set, using current timestamp {seed}")
    else:
        try:
            seed = int(seed)
            print(f"Seeding RNG with integer {seed}")
        except ValueError:
            print(f"Seeding RNG with string '{seed}'")
    random.seed(seed)


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

    csv_tools.add_input_output_arguments(parser)

    parser.add_argument(
        "--drop-dupes-first",
        help=(
            "prioritize dropping songs submitted by people with more dupes "
            "first"
        ),
        action=utils.BooleanOptionalAction,
        default=True,
    )

    csv_tools.add_output_parser_group(parser)

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
    group.add_argument(
        "--random-seed",
        help="value to seed Python's random module with",
        default=None,
    )

    return parser


def main(
    input_csv_path,
    output_csv_path,
    force_output,
    output_csv_tabs,
    output_order,
    output_dropped,
    drop_dupes_first,
    random_seed=None,
):
    """
    Main entry point for the script.

    Given the arguments parsed from the command line, performs the requested
    operations, including writing output to the specified file.

    :param input_csv_path: Path to input CSV file, or ``"-"`` for STDIN
    :param output_csv_path: Path to output CSV file, or ``None`` for STDOUT
    :param force_output: If output file already exists overwrite it, if
        intermediate directories on the path do not exist, create them
    :param output_csv_tabs: Output tabs instead of commas to separate tabular
        fields
    :param output_order: Order to print output lines in
    :param output_dropped: Whether or not to include dropped submissions in the
        output
    :param drop_dupes_first: Prioritize dropping songs by submitters with dupes
    :param random_seed: If given, a string or integer to use as a seed for the
        RNG before dropping any songs or populating bracket
    :returns: None
    """

    seed_rng(random_seed)
    data = csv_tools.get_csv_data(input_csv_path)
    data, dropped = choose_submissions(data, drop_dupes_first)
    seeds = get_seed_order(data)
    analysis.print_analysis(seeds, data)
    csv_tools.write_csv_data(
        output_csv_path,
        force_output,
        seeds,
        data,
        output_csv_tabs,
        output_order,
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
        random_seed = args.random_seed

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
        random_seed,
    )
