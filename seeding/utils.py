import re
import itertools
import math
import unicodedata

__all__ = (
    "chunk",
    "get_bracket_size",
    "get_canonical_artist",
    "get_canonical_submitter",
    "get_distance",
    "get_number_of_rounds",
    "get_shuffled_range",
    "has_byes",
    "insert_byes",
    "invert_list",
)


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


def get_bracket_size(n):
    """
    Given a total number of submissions, returns the best fit bracket size
    """

    if 96 <= n < 128:
        return 96
    elif 48 <= n < 64:
        return 48
    else:
        return 2 ** math.floor(math.log2(n))


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


def get_number_of_rounds(n):
    """
    Returns the total number of rounds for a bracket of size n.
    """

    return get_distance(0, n - 1) + 1


def get_shuffled_range(n):
    """
    Utility function to generate a random ordering of the integers in [0, n)

    :param n: The length of the returned list
    :returns: A list of the numbers from 0 to n-1, inclusive, shuffled
    """

    return random.sample(list(range(n)), k=n)


def has_byes(n):
    """
    Returns True if the bracket size, n, needs byes in the first round
    """

    return n in {48, 96}


def insert_byes(seeds):
    """
    If byes are required, inserts dummy seeds for the bye rows.

    If any changes are required, returns a new copy of the seeds list with the
    bye seeds interleaved.
    """

    n = len(seeds)

    if has_byes(n):
        # Every fourth submission should be a bye
        # The bye submissions are all at the end, so adding n to a 0-based index
        # will give a bye submission index
        seeds = list(
            itertools.chain.from_iterable(
                trio + (i + n,) for i, trio in enumerate(chunk(seeds, 3))
            )
        )

    return seeds


def invert_list(lst):
    """
    Returns a new list whose values are the corresponding indices in lst.

    The input list must contain every integer in range(len(lst)) exactly once.

    Example:
        >>> invert_list([2,0,3,1])
        [1, 3, 0, 2]
    """

    inverted = [None] * len(lst)
    for i, j in enumerate(lst):
        inverted[j] = i
    return inverted
