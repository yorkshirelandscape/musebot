import itertools
import math

__all__ = (
    "chunk",
    "get_bracket_size",
    "get_distance",
    "has_byes",
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


def has_byes(n):
    """
    Returns True if the bracket size, n, needs byes in the first round
    """

    return n in {48, 96}


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
