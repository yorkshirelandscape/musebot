import random, math

year = 1970
bracketsize = 128

f = open("seeding/input.txt", "r")
songstxt = f.readlines()
f.close()

#μ

class Song:
    def __init__(self, name, artist, submitter, seed, link, defaultseed=0):
        self.name = name
        self.artist = artist
        self.submitter = submitter
        self.seed = seed
        self.link = link
        self.duplicates = []
        self.defaultseed = defaultseed
        self.givenseed = 0
        self.elig_qbs = []
        self.badness = 0
    def spreadsheetstr(self):
        #This is called "spreadsheet" but really it's for the other program
        return f"{self.defaultseed}\t{self.seed}\t{self.submitter}\t{year}\t{self.name}\t{self.artist}"
    def __str__(self):
        #More human-friendly, use for Challonge or things not being fed into a program
        return f"\"{self.name}\" - {self.artist} ({self.submitter} {self.seed})"

allsongs = []
totalseedcounts = [0, 0, 0, 0, 0, 0, 0] #How many 0, 1, 2, ... seeds there are including alternates
rawsongs = songstxt#.split("\n")
for rawsong in rawsongs:
    attributes = rawsong.split("\t")
    newsong = Song(attributes[4], attributes[5], attributes[2], int(attributes[1]), attributes[6], int(attributes[0]))
    if len(attributes) > 8:
        newsong.duplicates.extend(attributes[8].split("~")) #for something I haven't implemented yet
    allsongs.append(newsong)
    totalseedcounts[newsong.seed] += 1

overall_seeds128 = [ \
[1, 128, 64, 65, 32, 97,  33, 96, 16, 113, 49, 80, 17, 112, 48, 81, 8, 121, 57, 72, 25, 104, 40, 89, 9,  120, 56, 73, 24, 105, 41, 88], \
[4, 125, 61, 68, 29, 100, 36, 93, 13, 116, 52, 77, 20, 109, 45, 84, 5, 124, 60, 69, 28, 101, 37, 92, 12, 117, 53, 76, 21, 108, 44, 85], \
[2, 127, 63, 66, 31, 98,  34, 95, 15, 114, 50, 79, 18, 111, 47, 82, 7, 122, 58, 71, 26, 103, 39, 90, 10, 119, 55, 74, 23, 106, 42, 87], \
[3, 126, 62, 67, 30, 99,  35, 94, 14, 115, 51, 78, 19, 110, 46, 83, 6, 123, 59, 70, 27, 102, 38, 91, 11, 118, 54, 75, 22, 107, 43, 86]]

overall_seeds96 = [ \
[1, 64, 65, 32, 33, 96, 16, 49, 80, 17, 48, 81, 8, 57, 72, 25, 40, 89, 9,  56, 73, 24, 41, 88], \
[4, 61, 68, 29, 36, 93, 13, 52, 77, 20, 45, 84, 5, 60, 69, 28, 37, 92, 12, 53, 76, 21, 44, 85], \
[2, 63, 66, 31, 34, 95, 15, 50, 79, 18, 47, 82, 7, 58, 71, 26, 39, 90, 10, 55, 74, 23, 42, 87], \
[3, 62, 67, 30, 35, 94, 14, 51, 78, 19, 46, 83, 6, 59, 70, 27, 38, 91, 11, 54, 75, 22, 43, 86]]

overall_seeds64 = [ \
[1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9,  56, 24, 41], \
[4, 61, 29, 36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44], \
[2, 63, 31, 34, 15, 50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42], \
[3, 62, 30, 35, 14, 51, 19, 46, 6, 59, 27, 38, 11, 54, 22, 43]]

osbysize = {128: overall_seeds128, 96: overall_seeds96, 64: overall_seeds64}
overall_seeds = osbysize[bracketsize]

#qb = "quarter bracket"
qbs = [[],[],[],[]]

#the songs, divvied up by seed. The unused ones will be removed in a bit
seedlists = [[],[],[],[],[],[],[]]
for song in allsongs:
    seedlists[song.seed].append(song)

for sl in seedlists:
    random.shuffle(sl)

songs = [] #only the ones that will show up in the bracket
leftovers = [] #the ones that won't
totalSoFar = 0
for i in range(7):
    slcopy = seedlists[i][:] #copied so that it's not modifying a list while looping through it
    for s in slcopy:
        totalSoFar += 1
        if totalSoFar <= bracketsize:
            continue
        #if it fails that condition it gets trimmed out of the main list, since it won't fit in the bracket.
        seedlists[i].remove(s)
        s.givenseed = totalSoFar
        leftovers.append(s)
    songs.extend(seedlists[i])

#how many of each seed there are, split up by quarter bracket
seed_dists = [ \
[0, 0, 0, 0, 0, 0, 0], \
[0, 0, 0, 0, 0, 0, 0], \
[0, 0, 0, 0, 0, 0, 0], \
[0, 0, 0, 0, 0, 0, 0]]
lens = [0, 0, 0, 0]

#probably a way to do this neater
for i in range(4):
    lens[i] = len(overall_seeds[i])
    for j in overall_seeds[i]:
        if j <= len(seedlists[0]): # if the seed j is <= number of 0 seeds
            seed_dists[i][0] += 1  # then increment the quarter's 0 seed count
        elif j <= len(seedlists[0]) + len(seedlists[1]):
            seed_dists[i][1] += 1
        elif j <= len(seedlists[0]) + len(seedlists[1]) + len(seedlists[2]):
            seed_dists[i][2] += 1
        elif j <= len(seedlists[0]) + len(seedlists[1]) + len(seedlists[2]) + len(seedlists[3]):
            seed_dists[i][3] += 1
        elif j <= len(seedlists[0]) + len(seedlists[1]) + len(seedlists[2]) + len(seedlists[3]) + len(seedlists[4]):
            seed_dists[i][4] += 1
        elif j <= len(seedlists[0]) + len(seedlists[1]) + len(seedlists[2]) + len(seedlists[3]) + len(seedlists[4]) + len(seedlists[5]):
            seed_dists[i][5] += 1
        elif j <= len(seedlists[0]) + len(seedlists[1]) + len(seedlists[2]) + len(seedlists[3]) + len(seedlists[4]) + len(seedlists[5]) + len(seedlists[6]):
            seed_dists[i][6] += 1

for sd in seed_dists:
    print(sd) #in case you want to see it

#For when you can't fit each one into a separate quarter
artistCounts = {}
submitterCounts = {} #excludes alternates. Used for when somebody's 5/6 gets bumped up to a 0 thus giving them 5 with seed <= 4

for s in songs:
    if s.artist not in artistCounts.keys():
        artistCounts[s.artist] = 1
    else:
        artistCounts[s.artist] += 1
    if s.seed <= 4:
        if s.submitter not in submitterCounts.keys():
            submitterCounts[s.submitter] = 1
        else:
            submitterCounts[s.submitter] += 1

finished = False #will be set to True once it's happy or given up
while not finished:
    for song in songs:
                                        # for each unplaced song, it checks for
        song.placingoptions = 0         # a) how many places in the bracket are left and
        song.unplacedconstraints = 0    # b) how many unplaced songs it conflicts with.
        song.elig_qbs = []              # this list is for later if it needs to assign it to one of the quarters
        for i in range(4): #for each qb
            optionshere = seed_dists[i][song.seed] # how many slots for a given seed are there in this quarter
            sharesubmitter = 0
            shareartist = 0
            for other in qbs[i]:
                if (other.artist == song.artist):
                    shareartist += 1
                    if shareartist >= math.ceil(artistCounts[song.artist]/4): #So e.g. an artist with 5-8 songs can show up twice
                        optionshere = 0
                        break
                if (other.submitter == song.submitter):
                    sharesubmitter += 1
                    if other.seed <= 4 and song.seed <= 4 and sharesubmitter >= math.ceil(submitterCounts[song.submitter]/4): #we conly really care if they're both non-alts
                        optionshere = 0
                        break
                    if other.seed >= 5 and song.seed >= 5: #Can't have both alternates in the same qb, that forces main songs too close
                        optionshere = 0
                        break
                if other.seed == song.seed: #can only have so many of each seed
                    optionshere -= 1
            song.placingoptions += optionshere
            if (optionshere > 0):
                song.elig_qbs.append(qbs[i])
        for other in songs:
            if (other.artist == song.artist):
                song.unplacedconstraints += 1
            if (other.submitter == song.submitter):
                song.unplacedconstraints += 1

    #Sorts by fewest valid locations in the bracket, then by how many conflicts with unplaced songs
    songs.sort(key = lambda x: x.unplacedconstraints, reverse=True)
    songs.sort(key = lambda x: x.placingoptions)

    #picks a song, yay
    songtoplace = songs[0]
    if (len(songtoplace.elig_qbs)==0): #lets you know if something goes wrong and what song broke it
        print('aaaaah')
        print(songtoplace)
        break

    eqb = random.choice(songtoplace.elig_qbs)
    eqb.append(songtoplace)
    songs.remove(songtoplace)
    print(songtoplace)

    #checks if all the qbs are filled up
    finished = True
    for i in range(4):
        if len(qbs[i]) < lens[i]:
            finished = False

for qb in qbs:
    for song in qb:
        print(song)
    print()


output = open("seeding/output.txt", "w")

#within each qb it's currently unordered so this gives an order to them based on relative seed
qbseedorder128 = [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22]
qbseedorder96 = [1, 16, 17, 8, 9, 24, 4, 13, 20, 5, 12, 21, 2, 15, 18, 7, 10, 23, 3, 14, 19, 6, 11, 22]
qbseedorder64 = [1, 16, 8, 9, 4, 13, 5, 12, 2, 15 ,7, 10, 3, 14, 6, 11]
qbsbysize = {128: qbseedorder128, 96: qbseedorder96}
qbseedorder = qbsbysize[bracketsize]

def printandwrite(s=""):
    print(s)
    output.write(s + "\n")

for j in range(4):
    print(len(qbs[j]))
    qbs[j].sort(key=lambda x: x.seed)

    for i in qbseedorder:
        if i <= (8):
            printandwrite() #breaks it up so it's not just a giant text block
        if i == 0:
            print()
        else:
            if (i <= len(qbs[j])):
                qbs[j][i-1].givenseed = overall_seeds[j][qbseedorder.index(i)]
                printandwrite(qbs[j][i-1].spreadsheetstr())
            else:
                print("X") #in case something went wrong and it didn't fill up. You should probably reroll if this comes up
    printandwrite()

for song in leftovers: #those alts
    print(song.spreadsheetstr())
    output.write(song.spreadsheetstr() + "\n")

for song in songs: # things that should have been slotted in but weren't. If any of these show up you should probably reroll
    print(song)

#if you want to count artists
'''for a in artistCounts.keys():
    if artistCounts[a] > 1:
        print(a + " - " + str(artistCounts[a]))'''

output.close()
