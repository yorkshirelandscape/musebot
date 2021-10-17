import random, math, collections

year = 1970
bracketSize = 128

f = open("seeding/input.txt", "r")
songstxt = f.readlines()
f.close()

class Song:
    def __init__(self, name, artist, submitter, order, seed=0):
        self.name = name
        self.artist = artist
        self.submitter = submitter
        self.order = order
        self.seed = seed
        self.quarter = 0
        self.badness = float(0)
        self.aDist = 0
        self.sDist = 0
        self.aCount = 0
        self.sCount = 0
    def spreadsheetstr(self):
        #This is called "spreadsheet" but really it's for the other program
        return f"{self.order}\t{self.seed}\t{self.submitter}\t{year}\t{self.name}\t{self.artist}"
    def __str__(self):
        #More human-friendly, use for Challonge or things not being fed into a program
        return f"\"{self.name}\" - {self.artist} ({self.submitter} {self.seed})"

allSongs = []
orderCounts = [] #How many 0, 1, 2, ... seeds there are including alternates
rawSongs = songstxt
for rs in rawSongs:
    attributes = rs.split("\t")
    newSong = Song(attributes[4], attributes[5], attributes[2], int(attributes[1]), int(attributes[0]))
    allSongs.append(newSong)
    while len(orderCounts) < newSong.order + 1:
        orderCounts.append(0)
    orderCounts[newSong.order] += 1

seedOrder128 = [ \
[1, 128, 64, 65, 32, 97,  33, 96, 16, 113, 49, 80, 17, 112, 48, 81, 8, 121, 57, 72, 25, 104, 40, 89, 9,  120, 56, 73, 24, 105, 41, 88], \
[4, 125, 61, 68, 29, 100, 36, 93, 13, 116, 52, 77, 20, 109, 45, 84, 5, 124, 60, 69, 28, 101, 37, 92, 12, 117, 53, 76, 21, 108, 44, 85], \
[2, 127, 63, 66, 31, 98,  34, 95, 15, 114, 50, 79, 18, 111, 47, 82, 7, 122, 58, 71, 26, 103, 39, 90, 10, 119, 55, 74, 23, 106, 42, 87], \
[3, 126, 62, 67, 30, 99,  35, 94, 14, 115, 51, 78, 19, 110, 46, 83, 6, 123, 59, 70, 27, 102, 38, 91, 11, 118, 54, 75, 22, 107, 43, 86]]

seedOrder96 = [ \
[1, 64, 65, 32, 33, 96, 16, 49, 80, 17, 48, 81, 8, 57, 72, 25, 40, 89, 9,  56, 73, 24, 41, 88], \
[4, 61, 68, 29, 36, 93, 13, 52, 77, 20, 45, 84, 5, 60, 69, 28, 37, 92, 12, 53, 76, 21, 44, 85], \
[2, 63, 66, 31, 34, 95, 15, 50, 79, 18, 47, 82, 7, 58, 71, 26, 39, 90, 10, 55, 74, 23, 42, 87], \
[3, 62, 67, 30, 35, 94, 14, 51, 78, 19, 46, 83, 6, 59, 70, 27, 38, 91, 11, 54, 75, 22, 43, 86]]

seedOrder64 = [ \
[1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9,  56, 24, 41], \
[4, 61, 29, 36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44], \
[2, 63, 31, 34, 15, 50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42], \
[3, 62, 30, 35, 14, 51, 19, 46, 6, 59, 27, 38, 11, 54, 22, 43]]

seedOrderBySize = {128: seedOrder128, 96: seedOrder96, 64: seedOrder64}
seedOrder = seedOrderBySize[bracketSize]

# hqs = [[[],[]],[[],[]]]
quarters = [[],[],[],[]]

#the songs, divvied up by seed. The unused ones will be removed in a bit
orderLists = []
while len(orderLists) < len(orderCounts):
    orderLists.append([])

for song in allSongs:
    orderLists[song.order].append(song)

# for l in orderLists:
#     for s in l:
#         print(s.spreadsheetstr())

for ol in orderLists:
    random.shuffle(ol)

songs = [] #only the ones that will show up in the bracket
extras = [] #the ones that won't
rows = len(seedOrder)
cols = len(seedOrder[0])
olLen = rows * cols
i = 0
for ol in orderLists:
    for s in ol:
        i += 1
        s.seed = i
        if i <= olLen:
            songs.append(s)
        else:
            extras.append(s)

# for s in songs:
    # print(s.spreadsheetstr())
# for e in extras:
#     print(e.spreadsheetstr())


#how many of each order there are, split up by quarter bracket
orderDists = [ \
[0, 0, 0, 0, 0, 0, 0], \
[0, 0, 0, 0, 0, 0, 0], \
[0, 0, 0, 0, 0, 0, 0], \
[0, 0, 0, 0, 0, 0, 0]]
lens = [0, 0, 0, 0]

for i in range(4):
    for j in seedOrder[i]:
        nextSong = next((s for s in songs if s.seed == j), None)
        quarters[i].append(nextSong)
        nextSong.quarter = i
        
# for q in quarters:
#     for s in q:
#         print(s.spreadsheetstr())

artistCounts = {}
submitterCounts = {}

for s in songs:
    if s.artist not in artistCounts.keys():
        artistCounts[s.artist] = {'total': 0, 0: 0, 1: 0, 2: 0, 3: 0}
    artistCounts[s.artist]['total'] += 1
    artistCounts[s.artist][s.quarter] += 1
    if s.submitter not in submitterCounts.keys():
        submitterCounts[s.submitter] = {'total': 0, 0: 0, 1: 0, 2: 0, 3: 0}
    submitterCounts[s.submitter]['total'] += 1
    submitterCounts[s.submitter][s.quarter] += 1    

# print(submitterCounts)

minADist = 8
minSDist = 8
for q in quarters:
    for s in q:
        aCount = sum(s.artist == ss.artist for ss in q)
        if aCount > 1:
            nextArtist = next((ss for ss in q if s.artist == ss.artist and s != ss), None)
            aDist = abs(q.index(nextArtist) - q.index(s))
            if aDist <= minADist:
                s.badness += float(1 / aDist)
        
        sCount = sum(s.submitter == ss.submitter for ss in q)
        if sCount > 1:
            nextArtist = next((ss for ss in q if s.submitter == ss.submitter and s != ss), None)
            sDist = abs(q.index(nextArtist) - q.index(s))
            if sDist <= minSDist:
                s.badness += float(1 / sDist)
        print(s.artist, " - ", s.name, ": ", s.badness)
        
    # print(s.spreadsheetstr())
    # print('Artist:', s.aCount, 'Submitter:', s.sCount)

def swap(song, att):
    for q in quarters:
        sq = next((s for s in songs if s == song), None)
        if sq == None:
            r = next((s for s in songs if s.submitter == song.submitter and s != song), None)