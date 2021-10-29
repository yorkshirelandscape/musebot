import collections
import csv
import itertools
import numpy as np
import operator
import random
import sys
from tabulate import tabulate
from operator import itemgetter

YEAR = 1970
BRACKET_SIZE = 128
INPUT_PATH = "seeding/input.txt"
# 'order' is the submitter's submission order
# 'seed' is the final ranking
INPUT_COLS = ["seed", "orderStr", "submitter", "year", "title", "artist", "link"]


seed_order = {
    128: [
        [1, 128, 64, 65, 32, 97,  33, 96, 16, 113, 49, 80, 17, 112, 48, 81, 8, 121, 57, 72, 25, 104, 40, 89, 9,  120, 56, 73, 24, 105, 41, 88],
        [4, 125, 61, 68, 29, 100, 36, 93, 13, 116, 52, 77, 20, 109, 45, 84, 5, 124, 60, 69, 28, 101, 37, 92, 12, 117, 53, 76, 21, 108, 44, 85],
        [2, 127, 63, 66, 31, 98,  34, 95, 15, 114, 50, 79, 18, 111, 47, 82, 7, 122, 58, 71, 26, 103, 39, 90, 10, 119, 55, 74, 23, 106, 42, 87],
        [3, 126, 62, 67, 30, 99,  35, 94, 14, 115, 51, 78, 19, 110, 46, 83, 6, 123, 59, 70, 27, 102, 38, 91, 11, 118, 54, 75, 22, 107, 43, 86],
    ],
    96: [
        [1, 64, 65, 32, 33, 96, 16, 49, 80, 17, 48, 81, 8, 57, 72, 25, 40, 89, 9,  56, 73, 24, 41, 88],
        [4, 61, 68, 29, 36, 93, 13, 52, 77, 20, 45, 84, 5, 60, 69, 28, 37, 92, 12, 53, 76, 21, 44, 85],
        [2, 63, 66, 31, 34, 95, 15, 50, 79, 18, 47, 82, 7, 58, 71, 26, 39, 90, 10, 55, 74, 23, 42, 87],
        [3, 62, 67, 30, 35, 94, 14, 51, 78, 19, 46, 83, 6, 59, 70, 27, 38, 91, 11, 54, 75, 22, 43, 86],
    ],
    64: [
        [1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9,  56, 24, 41],
        [4, 61, 29, 36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44],
        [2, 63, 31, 34, 15, 50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42],
        [3, 62, 30, 35, 14, 51, 19, 46, 6, 59, 27, 38, 11, 54, 22, 43],
    ]
}[BRACKET_SIZE]


class Song:
    def __init__(self, **kwargs):
        for attr in INPUT_COLS:
            setattr(self, attr, kwargs[attr])
        self.order = int(self.orderStr)
        self.quarter = 0
        self.artist_badness = float(0)
        self.submitter_badness = float(0)
        self.swapped = False

    def get_row(self):
        # Standard output format to export to the spreadsheet
        return "\t".join(getattr(self, attr) for attr in INPUT_COLS)

    def __str__(self):
        # More human-friendly, use for Challonge or things not being fed into a program
        return f'"{self.title}" - {self.artist} ({self.submitter} {self.seed})'



# Read the input csv, create a Song instance for each row
with open(INPUT_PATH, newline="") as csvfile:
    reader = csv.DictReader(csvfile, delimiter="\t", fieldnames=INPUT_COLS)
    all_songs = [Song(**row) for row in reader]

# The songs, divvied up by order
# The unused ones will be removed in a bit
# This is a dictionary with the order as key and list of songs as value
order_lists = collections.defaultdict(list)
for song in all_songs:
    order_lists[song.order].append(song)


songs = [] # only the ones that will show up in the bracket
extras = [] # the ones that won't

i = 0

# Iterates over the order_lists in order by sorted key
for order, cur_list in sorted(order_lists.items()):
    random.shuffle(cur_list)
    for song in cur_list:
        i += 1
        song.seed = i
        if i <= BRACKET_SIZE:
            songs.append(song)
        else:
            extras.append(song)

gQuarters = [
    # Index within `songs` is the same as song.seed - 1
    [songs[seed - 1] for seed in seed_order[quarter]]
    for quarter in range(4)
    ]

for gQuarter in range(4):
    for song in gQuarters[gQuarter]:
        song.quarter = gQuarter


def artists_are_equal(a, b):
    """
    Placeholder comparison function for two artist strings

    Right now just straight equality, could strip characters/change case later
    """
    return a == b


def do_counts(print_artists = False, print_submitters = False):
    artistCounts = {}
    submitterCounts = {}

    for q in gQuarters:
        for s in q:
            if s.artist not in artistCounts.keys():
                artistCounts[s.artist] = {'artist': s.artist, 'total': 0, 0: 0, 1: 0, 2: 0, 3: 0}
            artistCounts[s.artist]['total'] += 1
            artistCounts[s.artist][s.quarter] += 1
            if s.submitter not in submitterCounts.keys():
                submitterCounts[s.submitter] = {'submitter': s.submitter, 'total': 0, 'Q0': 0, 'Q1': 0, 'Q2': 0, 'Q3': 0, 'top4': 4, 'o0': 0, 'o1': 0, 'o2': 0, 'o3': 0, 'o4': 0, 'o5': 0, 'o6': 0}
            submitterCounts[s.submitter]['total'] += 1
            submitterCounts[s.submitter][f'o{s.order}'] += 1

    for s in submitterCounts.values():
        if s['o0'] >= 4:
            s['top4'] = 0
        elif s['o0'] + s['o1'] >= 4:
            s['top4'] = 1
        elif s['o0'] + s['o1'] + s['o2'] >= 4:
            s['top4'] = 2
        elif s['o0'] + s['o1'] + s['o2'] + s['o3'] >= 4:
            s['top4'] = 3
        else: s['top4'] = 4
    
    for q in gQuarters:
        for s in q:
            if s.order <= submitterCounts[s.submitter]['top4']:
                submitterCounts[s.submitter][f'Q{s.quarter}'] += 1
    
    if print_artists is True:
        headers = ['Artist', 'Total', 'Q0', 'Q1', 'Q2', 'Q3']
        sort_list = sorted((list(cols.values()) for cols in artistCounts.values()),key=itemgetter(0))
        data = sorted(sort_list,key=itemgetter(1),reverse=True)
        print(tabulate(data, headers = headers))
        print('\n')
    if print_submitters is True:
        headers = ['Submitter', 'Total', 'Q0', 'Q1', 'Q2', 'Q3', 'top4', 0, 1, 2, 3, 4, 5 ,6]
        sort_list = (list(cols.values()) for cols in submitterCounts.values())
        data = [list(submitterCounts[k].values()) for k in sorted(submitterCounts, key=str.lower)]
        print(tabulate(data, headers = headers))
        print('\n')
    
    return artistCounts, submitterCounts


# calculate how close songs by the same submitter or artist are to each other
# only counts the distance if the songs are within the same group of $groupSize songs
# this is either not 100% reliable or is not being performed at the right times, not sure which yet
def set_badness(cur_song, quarters, group_size = 8):
    # min_artist_distance = 4
    # min_submitter_distance = 4
    
    artist_counts, submitter_counts = do_counts()
    
    quarter = quarters[cur_song.quarter]
    index = quarter.index(cur_song)
    # Index of the first song in the current song's group
    group_start = (index // group_size) * group_size
    group = quarter[group_start:group_start + group_size]
    gIndex = group.index(cur_song)

    cur_song.artist_badness = 0
    artist_indexes = [
        i
        for i, song in enumerate(group)
        if song != cur_song and artists_are_equal(song.artist, cur_song.artist)
    ]
    if artist_indexes:
        artist_distance = min(abs(i - gIndex) for i in artist_indexes)
        # if artist_distance <= min_artist_distance:
        cur_song.artist_badness = 1 / artist_distance

    cur_song.submitter_badness = 0
    submitter_indexes = [
        i
        for i, song in enumerate(group)
        if song != cur_song and song.submitter == cur_song.submitter
    ]
    if submitter_indexes:
        submitter_distance = min(abs(i - gIndex) for i in submitter_indexes)
        # if submitter_distance <= min_submitter_distance:
        cur_song.submitter_badness = 1 / submitter_distance
    
    if (submitter_counts[cur_song.submitter][f'Q{cur_song.quarter}'] > 1# submitter_counts[cur_song.submitter]['total'] // 4
    and cur_song.order <= submitter_counts[cur_song.submitter]['top4']):
            cur_song.submitter_badness = 1

# this swaps the provided song for another that seems appropriate
# attr indicates whether it should replace based on the artist or submitter
# qSkip is probably no longer necessary, but tells it to try another quarter if it's repeating itself
def swap_songs(cur_song, attr, quarters, search_quarter = None, skipSwapped=False, group_size = 8):
    if attr == "artist":
        cmp = artists_are_equal
    elif attr == "submitter":
        cmp = lambda a, b: a.submitter == b.submitter
    else:
        raise ValueError(f"swap_songs called with invalid attribute `{attr}`")
    badness_attr = f"{attr}_badness"
    swap_song = None
    quarters_left = set(range(4)) - {cur_song.quarter}
    while swap_song is None and quarters_left:
        quarter = random.choice(list(quarters_left))
        quarters_left.remove(quarter)
        sorted_songs = sorted(
            search_quarter[0] if search_quarter else quarters[quarter],
            key=operator.attrgetter(badness_attr),
            reverse=True,
        )
        swap_song = next(
            (
                song
                for song in sorted_songs
                if (
                    song.order == cur_song.order
                    and not cmp(cur_song, song)
                    and ((skipSwapped == True and song.swapped != True)
                    or skipSwapped == False)
                )
            ),
            None,
        )
    if swap_song is None:
        sorted_songs = sorted(
            quarters[cur_song.quarter],
            key=operator.attrgetter(badness_attr),
            reverse=True,
        )
        swap_song = next(
            (
                song
                for song in sorted_songs
                if (
                    song.order == cur_song.order
                    and not cmp(cur_song, song)
                    and ((skipSwapped == True and song.swapped != True)
                    or skipSwapped == False)
                )
            ),
            None,
        )
        if swap_song is None:
            print("couldn't swap {cur_song}")
            return

    # Swap the songs in the quarters variable
    (
        quarters[swap_song.quarter][quarters[swap_song.quarter].index(swap_song)],
        quarters[cur_song.quarter][quarters[cur_song.quarter].index(cur_song)],
    ) = cur_song, swap_song
    # Swap the quarter attributes of the two songs
    swap_song.quarter, cur_song.quarter = cur_song.quarter, swap_song.quarter
    swap_song.swapped = True
    cur_song.swapped = True
    cur_song_badness = getattr(cur_song, badness_attr)
    swap_song_badness = getattr(swap_song, badness_attr)
    print(
        f"{cur_song.artist} - {cur_song.title} ({cur_song_badness:.4f} {cur_song.quarter})"
        f" << {attr} >> "
        f"{swap_song.artist} - {swap_song.title} ({swap_song_badness:.4f} {swap_song.quarter})"
    )
    set_badness(cur_song, quarters, group_size)
    set_badness(swap_song, quarters, group_size)

    return swap_song


def initial_swaps(print_attr=False, attr='b', quarters=gQuarters):
    artist_counts, submitter_counts = do_counts(False, False)

    if attr in ['a','b']:
        artists = list(artist_counts.keys())
        for artist in artists:
            quarters_to = set(q for q in range(4) if artist_counts[artist][q] == 0)
            quarters_from = set(q for q in range(4) if artist_counts[artist][q] > 1)
            while quarters_from and quarters_to:
                qt = random.choice(list(quarters_to))
                quarters_to.remove(qt)
                qf = random.choice(list(quarters_from))
                quarters_from.remove(qf)
                while artist_counts[artist][qf] > 1 and artist_counts[artist][qt] == 0:
                    cur_song = next(song for song in quarters[qf] if song.artist == artist)
                    swap_song = swap_songs(cur_song, 'artist', quarters, [quarters[qt]], False)
                    if swap_song == None:
                        break
                    artist_counts, submitter_counts = do_counts(False, False)

    if attr in ['s','b']:
            submitters = list(submitter_counts.keys())
            for submitter in submitters:
                quarters_to = set(q for q in range(4) if submitter_counts[submitter][f'Q{q}'] == 0)
                quarters_from = set(q for q in range(4) if submitter_counts[submitter][f'Q{q}'] > 1)
                while quarters_from:
                    qt = random.choice(list(quarters_to))
                    quarters_to.remove(qt)
                    qf = random.choice(list(quarters_from))
                    quarters_from.remove(qf)
                    while submitter_counts[submitter][f'Q{qf}'] > 1:
                        cur_song = next(song for song in quarters[qf] if song.submitter == submitter
                            and song.order <= submitter_counts[submitter]['top4'])
                        swap_song = swap_songs(cur_song, 'submitter', quarters, [quarters[qt]], False)
                        if swap_song == None:
                            break
                        artist_counts, submitter_counts = do_counts(False, False)

    artist_counts, submitter_counts = do_counts(bool(print_attr), bool(print_attr))


def max_badness(songs):
    return max(max(song.artist_badness, song.submitter_badness) for song in songs)

def end():
    for song in songs:
        set_badness(song, gQuarters)
    
    print(f"\nMaximum remaining badness: {max_badness(songs)}\n")
    
    # print out the results
    for quarter in gQuarters:
        for index, song in enumerate(quarter):
            for group in [32, 16, 8, 4]:
                if index % group == 0:
                    print("-" * group)
                    break
            print(f"{song.artist} - {song.title} - {song.submitter}: {song.artist_badness:.4f} {song.submitter_badness:.4f} {song.swapped}")
    print('\n')
    do_counts(True, True)


def deque_slice(d, x, y):
    dd = d.copy()
    dd.rotate(-x)
    while len(dd) > y - x:
        dd.pop()
    return dd

# loop over all songs infinitely, swapping songs that qualify
# do this until all songs are below bad_limit or...
# the next song already appears twice in the last maxlen replacements
def do_swaps(submitter_counts, quarters=gQuarters, group_size = 8):
    recent_size = 16
    recent_big = collections.deque(maxlen=recent_size)
    recent_small = collections.deque(maxlen=3)
    it = itertools.cycle(songs)
    i = 0
    try:   
        while max_badness(songs) > bad_limit:
            song = next(it)
            if song.artist_badness > bad_limit or song.submitter_badness > bad_limit:
                recent_medium = deque_slice(recent_big, 0, recent_size-4) 
                recent_intersection = list(set(recent_medium) & set(recent_small))
                recent_check = np.array_equal(set(recent_small), set(recent_intersection))
                if recent_check and len(recent_big) == recent_size:
                    # Too much repetition, just stop
                    # TODO Improve/avoid this scenario
                    print(f"{song.artist} - {song.title}")
                    print("This configuration not working, try again")
                    # sys.exit(1)
                    i = input('Try again? Y or N:')
                    if str.lower(i) in ('y', 'yes'):
                        do_swaps(submitter_counts)
                        break
                    elif str.lower(i) in ('n', 'no'):
                        # end()
                        break
                attr = "artist" if song.artist_badness > song.submitter_badness else "submitter"
                if submitter_counts[song.submitter][f'Q{song.quarter}'] == 1:
                    swap_song = swap_songs(song, attr, quarters, [quarters[song.quarter]], recent_check, group_size)
                else: swap_song = swap_songs(song, attr, quarters, None, True, group_size)
                if swap_song is None:
                    swap_song = swap_songs(song, attr, quarters, None, False, group_size)
                if swap_song is None:
                    i += 1
                else: 
                    i = 0
                    recent_big.append(song)
                    recent_small.append(song)
                if i > 4:
                    # end()
                    break
    except KeyboardInterrupt:
        for song in songs:
            set_badness(song, quarters)
        print('\n')
        do_counts(False, True)
        i = input('Options: (r)esume swapping, (e)nd, (q)uit (or [Enter]):')
        if str.lower(i) in ('r', 'resume'):
            do_swaps(submitter_counts)
        if str.lower(i) in ('e', 'end'):
            # end()
            pass
        if str.lower(i) in ('q', 'quit'):
            sys.exit(1)


# calculate all the badnesses
for song in songs:
    set_badness(song, gQuarters)

do_counts(False, True)

initial_swaps(False)

initial_swaps(True)

gArtist_counts, gSubmitter_counts = do_counts(False, False)

# the maximum allowable badness
# if all songs are below this threshold, the process will terminate
bad_limit = 0.0

for g in [2,4,8]:
    print(f'\nGroup size: {g}\n')
    do_swaps(gSubmitter_counts, gQuarters, g)
    for song in songs:
        set_badness(song, gQuarters, g)
    print(f'Max badness: {max_badness(songs)}')

do_counts(False, False)

initial_swaps(False)
initial_swaps(True)

response = input('Do initial swaps again? (a)rtist, (s)ubmitter, (b)oth, (n)one:')
while str.lower(response) not in ('n', 'none'):
    initial_swaps(True, response[:1])
    response = input('Do initial swaps again? (a)rtist, (s)ubmitter, (b)oth, (n)one:')


print(f'Max badness: {max_badness(songs)}')

end()
