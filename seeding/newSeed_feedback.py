import collections
import csv
import itertools
import math
import operator
import random
import sys


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

quarters = [
    # Index within `songs` is the same as song.seed - 1
    [songs[seed - 1] for seed in seed_order[quarter]]
    for quarter in range(4)
]
for quarter in range(4):
    for song in quarters[quarter]:
        song.quarter = quarter


def artists_are_equal(a, b):
    """
    Placeholder comparison function for two artist strings

    Right now just straight equality, could strip characters/change case later
    """
    return a == b


# calculate how close songs by the same submitter or artist are to each other
# only counts the distance if the songs are within the same group of $groupSize songs
# this is either not 100% reliable or is not being performed at the right times, not sure which yet
def set_badness(cur_song, quarters):
    # min_artist_distance = 4
    # min_submitter_distance = 4
    group_size = 8
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


# this swaps the provided song for another that seems appropriate
# attr indicates whether it should replace based on the artist or submitter
# qSkip is probably no longer necessary, but tells it to try another quarter if it's repeating itself
def swap_songs(cur_song, attr, quarters, skipSwapped=False):
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
            quarters[quarter],
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
    set_badness(cur_song, quarters)
    set_badness(swap_song, quarters)



# calculate all the badnesses
for song in songs:
    set_badness(song, quarters)


# the maximum allowable badness
# if all songs are below this threshold, the process will terminate
bad_limit = 0.0


def max_badness(songs):
    return max(max(song.artist_badness, song.submitter_badness) for song in songs)


# loop over all songs infinitely, swapping songs that qualify
# do this until all songs are below bad_limit or...
# the next song already appears twice in the last 12 replacements
recent = collections.deque(maxlen=2)
it = itertools.cycle(songs)
while max_badness(songs) > bad_limit:
    song = next(it)
    if song.artist_badness > bad_limit or song.submitter_badness > bad_limit:
        recent_count = recent.count(song)
        if recent_count > 1:
            # Too much repetition, just stop
            # TODO Improve/avoid this scenario
            print("This configuration not working, try again")
            sys.exit(1)
            # continue
        attr = "artist" if song.artist_badness > song.submitter_badness else "submitter"
        swap_songs(song, attr, quarters, bool(recent_count))
        recent.append(song)

print(f"Maximum remaining badness: {max_badness(songs)}")

for song in songs:
    set_badness(song, quarters)

# print out the results
for quarter in quarters:
    for index, song in enumerate(quarter):
        for group in [32, 16, 8, 4]:
            if index % group == 0:
                print("-" * group)
                break
        print(f"{song.artist} - {song.title} - {song.submitter}: {song.artist_badness:.4f} {song.submitter_badness:.4f} {song.swapped}")

artistCounts = {}
submitterCounts = {}

for q in quarters:
    for s in q:
        if s.artist not in artistCounts.keys():
            artistCounts[s.artist] = {'total': 0, 0: 0, 1: 0, 2: 0, 3: 0}
        artistCounts[s.artist]['total'] += 1
        artistCounts[s.artist][s.quarter] += 1
        if s.submitter not in submitterCounts.keys():
            submitterCounts[s.submitter] = {'total': 0, 'Q0': 0, 'Q1': 0, 'Q2': 0, 'Q3': 0, 'top4': 4, 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
        submitterCounts[s.submitter]['total'] += 1
        submitterCounts[s.submitter]['Q' + f'{s.quarter}'] += 1    
        submitterCounts[s.submitter][s.order] += 1
        if s.order == 0:
            submitterCounts[s.submitter]['top4'] -= 1

for key, value in artistCounts.items():
    print(f'{key}: \t\t{value}')
for key, value in submitterCounts.items():
    print(f'{key}: \t\t{value}')
