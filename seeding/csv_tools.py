#! /bin/env python3

import argparse
import csv
import itertools
import os
import random
import sys

import analysis
import utils

__all__ = (
    "add_input_output_arguments",
    "add_output_parser_group",
    "get_csv_data",
    "write_csv_data",
)

class CsvToolsException(Exception):
    pass

class Order:
    SORTED = "sorted"
    ORIGINAL = "original"
    BRACKET = "bracket"

    @classmethod
    def all(cls):
        return (cls.SORTED, cls.ORIGINAL, cls.BRACKET)

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

DEFAULT_COLUMNS = ("order", "seed", "submitter", "year", "song", "artist", "link", "submitters")


def reverse_seeded_csv(file, order):
    """
    Reads the CSV data from the open file handle and returns the seed data.

    Returns the data as it would have been given to output_seeded_csv. The
    options given to this function should be the same as those given to
    output_seeded_csv when creating the CSV.

    The value for the use_tabs argument will be determined automatically based
    on the presence of tab characters in the first row of data.

    Note: if the output CSV does not contain dropped rows, this function is
    unable to recover them.

    :param file: Open file or file-like handle
    :param order: The output ordering used
    :param dropped: Whether the output included dropped rows or not
    :returns: Tuple of (seeds, data, use_tabs, dropped), as originally passed to output_seeded_csv
    """

    data = list(file)
    delimiter = "\t" if "\t" in data[0] else ","
    # We assume there's a header row since we always output one
    reader = csv.reader([data.pop(0)], delimiter=delimiter)
    headers = next(reader)

    if "order" not in headers:
        raise CsvToolsException("Missing required column `order` for reversing output CSV")

    # Sort by original `order` column
    # We convert to an integer for sorting, but don't use it anywhere else so
    # leave as a string in the actual data
    data = sorted(csv.DictReader(data, fieldnames=headers, delimiter=delimiter), key=lambda x: int(x["order"]))

    # This is the only column we added
    # Originally we had seeds using values 0 to size-1 but output it starting from 1
    # Restore the original 0-indexed behavior here
    seeds = [int(row.pop("new_order")) - 1 for row in data]

    size = utils.get_bracket_size(len(data))

    dropped = []
    if len(data) > size:
        # We have to make a copy to be able to mess with it while we're iterating
        # Shallow copy is fine here since we're not messing with individual rows
        new_data = data.copy()
        # We have dropped submissions in the output
        # They will always have a new_order > size (but remember we've already subtracted 1)
        # We need to reconstruct the `dropped` tuples
        # - The first element of this tuple is the index in data
        # - The second is new_order (and we re-add the 1 back in here)
        # - The third is the dropped data row itself
        for i, seed in enumerate(seeds):
            if seed >= size:
                dropped.append((i, seed + 1, data[i]))
                new_data.remove(data[i])
        # Now that we're done iterating, we don't care about keeping the old one
        data = new_data
        # We didn't want to remove anything from seeds while iterating over it
        # Now we can drop rows from that as well
        seeds = [seed for seed in seeds if seed < size]
        # `dropped` should be in original list order, as returned by `choose_submissions`

    # For bracket ordering, we need to reverse the transformation on the seeds
    if order == Order.BRACKET:
        # bracket_order values are also 1-indexed
        inverted_bracket_order = utils.invert_list(list(map(lambda x: x - 1, ORDERS[size])))
        seeds = [inverted_bracket_order[v] for v in seeds]

    # Now we need to recreate the actual `seeds` list, which uses the seed value
    # as the index and the index in data as the value
    seeds = utils.invert_list(seeds)

    # We also recreate this Boolean based on whether we found tabs in the CSV
    use_tabs = delimiter == "\t"

    return seeds, data, use_tabs, dropped


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
            headers = DEFAULT_COLUMNS
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


def get_csv_data(csv_path, parser=read_csv_from_file, *args, **kwargs):
    """
    Given a path to a CSV file (or ``"-"``), returns the parsed data.

    If given, any extra args or kwargs are passed directly to the parser
    function.

    :param csv_path: Path to the CSV input file, or ``"-"`` for STDIN
    :param parser: Function to call to read the CSV data from the given file
        defaults to `read_csv_from_file`
    :returns: Parsed CSV data as a list of dicts

    .. seealso:: `read_csv_from_file` for more details regarding the specific
        output format and required columns
    """

    if csv_path == '-':
        return parser(sys.stdin, *args, **kwargs)
    else:
        with open(csv_path, newline='') as csv_file:
            return parser(csv_file, *args, **kwargs)


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

    size = len(seeds)

    if order == Order.BRACKET and size not in ORDERS:
        print(
            f"ERROR Bracket ordering requested but no ordering defined for a "
            f"{size} bracket, using `original`"
        )
        order = Order.ORIGINAL

    print(f"Writing CSV in {order} order")
    writer = csv.writer(file, delimiter=delimiter, quoting=quoting)
    # Write header row first
    writer.writerow(["new_order"] + list(data[0].keys()))

    if order == Order.SORTED:
        ordered_data = (
            [i + 1] + list(data[j].values())
            for i, j in enumerate(seeds)
        )
    elif order == Order.ORIGINAL:
        # Invert the seeding list so we can iterate in original order
        original_seeds = utils.invert_list(seeds)
        ordered_data = (
            [original_seeds[i] + 1] + list(row.values())
            for i, row in enumerate(data)
        )
    elif order == Order.BRACKET:
        # Invert the seeding list so we can iterate in original order
        original_seeds = utils.invert_list(seeds)
        # Now transform these values to fit the traversal order hardcoded into
        # the spreadsheet
        bracket_order = ORDERS[size]
        ordered_data = (
            [bracket_order[original_seeds[i]]] + list(row.values())
            for i, row in enumerate(data)
        )

    if dropped:
        if order == Order.SORTED:
            # Put the dropped stuff at the end, in sorted order
            ordered_data = itertools.chain(
                ordered_data,
                sorted([seed] + list(row.values()) for _, seed, row in dropped),
            )
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


def write_csv_data(csv_path, force, seeds, data, use_tabs, output_order, dropped):
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
        return output_seeded_csv(sys.stdout, seeds, data, use_tabs, output_order, dropped)

    if force:
        dirs = os.path.dirname(csv_path)
        if dirs:
            os.makedirs(dirs, exist_ok=True)

    mode = "w" if force else "x"

    with open(csv_path, mode, newline="") as csv_file:
        return output_seeded_csv(csv_file, seeds, data, use_tabs, output_order, dropped)


def get_dropped(seeds, data):
    """
    Given some input CSV data and a list of seeds, drop submissions that don't fit

    This will return a tuple of (seeds, data, dropped) with the dropped rows
    removed from both seeds and data. This will not change the input parameters.

    The `dropped` list follows the same format as elsewhere, with each element
    being a tuple containing the index in the original data, the seed (1-indexed),
    and the dropped data row.
    """

    size = utils.get_bracket_size(len(data))

    # Shallow copy is fine, we're not messing with the individual rows
    new_data = data.copy()
    dropped = []

    for i, seed in enumerate(seeds):
        if seed >= size:
            dropped.append((i, seed + 1, data[i]))
            new_data.remove(data[i])
    new_seeds = [seed for seed in seeds if seed < size]

    return new_seeds, new_data, dropped


def add_input_output_arguments(parser):
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


def add_output_parser_group(parser):
    group = parser.add_argument_group(
        title="output arguments",
        description="Configure output CSV formatting",
    )
    group.add_argument(
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
    group.add_argument(
        "--output-csv-tabs",
        help="use a tab delimiter when outputting the CSV data",
        action=utils.BooleanOptionalAction,
        default=True,
    )
    group.add_argument(
        "--output-order",
        help=(
            f"the order to sort and/or transform the output seeding by. For "
            f"`{Order.SORTED}`, submissions are sorted by the new seeding order. "
            f"For `{Order.ORIGINAL}`, submissions retain their original positioning "
            f"within the input data. For `{Order.BRACKET}`, the generated seeding "
            f"order is transformed so that when the spreadsheet creates matches "
            f"it'll end up with them in the proposed ordering. Output order is "
            f"the same as the input data."
        ),
        choices=Order.all(),
        default=Order.BRACKET,
    )
    group.add_argument(
        "--output-dropped",
        help=(
            f"include dropped songs in the output CSV data. Dropped rows will "
            f"have an empty value for the new seed position. In `{Order.SORTED}` "
            f"output order, dropped submissions will be at the end."
        ),
        action=utils.BooleanOptionalAction,
        default=True,
    )
    return group


def get_parser():
    """
    Creates and return the ArgumentParser for the script.

    :returns: Instantiated and fully configured instance of ArgumentParser
    """

    parser = argparse.ArgumentParser(
        description="tools for reading and writing bracket CSVs",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        usage=f"{os.path.basename(__file__ or 'csv.py')} [OPTIONS] INPUT [OUTPUT]",
    )

    add_input_output_arguments(parser)

    add_output_parser_group(parser)

    group = parser.add_argument_group(
        title="CSV tools arguments",
        description="options for running specific utility commands on CSVs",
    )
    group.add_argument(
        "--reverse-input",
        help=(
            "assume the INPUT argument is actually an output CSV that needs to "
            "be reversed to recover the input data"
        ),
        action="store_true",
        default=False,
    )
    group.add_argument(
        "--input-order",
        help=(
            "if the INPUT points to a file output from a previous run, set the "
            "ordering that CSV data was generated with. If not given, defaults "
            "to the same as --output-order"
        ),
        choices=Order.all(),
        default=None,
    )
    group.add_argument(
        "--randomize-seeding",
        help=(
            "pick random numbers for seeds rather than picking the songs in "
            "order"
        ),
        action="store_true",
        default=False,
    )
    group.add_argument(
        "--analyze",
        help="print an analysis of the output CSV data",
        action="store_true",
        default=False,
    )

    return parser


def main(
    input_csv_path,
    output_csv_path,
    force_output,
    output_csv_tabs,
    output_order,
    output_dropped,
    reverse_input,
    input_order,
    randomize_seeding,
    analyze,
):
    if reverse_input:
        seeds, data, _, dropped = get_csv_data(input_csv_path, reverse_seeded_csv, input_order)
    else:
        data = get_csv_data(input_csv_path)
        if randomize_seeding:
            seeds = utils.get_shuffled_range(len(data))
        else:
            seeds = list(range(len(data)))
        seeds, data, dropped = get_dropped(seeds, data)

    if analyze:
        analysis.print_analysis(seeds, data)

    write_csv_data(
        output_csv_path,
        force_output,
        seeds,
        data,
        output_csv_tabs,
        output_order,
        dropped if output_dropped else None,
    )


if __name__ == "__main__":
    parser = get_parser()
    args = parser.parse_args()
    input_csv_path =  args.INPUT
    output_csv_path = args.OUTPUT
    force_output = args.force

    output_csv_tabs = args.output_csv_tabs
    output_order = args.output_order
    output_dropped = args.output_dropped

    randomize_seeding = args.randomize_seeding

    reverse_input = args.reverse_input
    input_order = args.output_order if args.input_order is None else args.input_order

    analyze = args.analyze

    main(
        input_csv_path,
        output_csv_path,
        force_output,
        output_csv_tabs,
        output_order,
        output_dropped,
        reverse_input,
        input_order,
        randomize_seeding,
        analyze,
    )
