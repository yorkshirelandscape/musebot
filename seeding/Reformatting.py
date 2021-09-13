import random

bracketsize = 128


overall_seeds128 = [ \
1, 128, 64, 65, 32, 97,  33, 96, 16, 113, 49, 80, 17, 112, 48, 81, 8, 121, 57, 72, 25, 104, 40, 89, 9,  120, 56, 73, 24, 105, 41, 88, \
4, 125, 61, 68, 29, 100, 36, 93, 13, 116, 52, 77, 20, 109, 45, 84, 5, 124, 60, 69, 28, 101, 37, 92, 12, 117, 53, 76, 21, 108, 44, 85, \
2, 127, 63, 66, 31, 98,  34, 95, 15, 114, 50, 79, 18, 111, 47, 82, 7, 122, 58, 71, 26, 103, 39, 90, 10, 119, 55, 74, 23, 106, 42, 87, \
3, 126, 62, 67, 30, 99,  35, 94, 14, 115, 51, 78, 19, 110, 46, 83, 6, 123, 59, 70, 27, 102, 38, 91, 11, 118, 54, 75, 22, 107, 43, 86]

overall_seeds96 = [ \
1, 64, 65, 32, 33, 96, 16, 49, 80, 17, 48, 81, 8, 57, 72, 25, 40, 89, 9,  56, 73, 24, 41, 88, \
4, 61, 68, 29, 36, 93, 13, 52, 77, 20, 45, 84, 5, 60, 69, 28, 37, 92, 12, 53, 76, 21, 44, 85, \
2, 63, 66, 31, 34, 95, 15, 50, 79, 18, 47, 82, 7, 58, 71, 26, 39, 90, 10, 55, 74, 23, 42, 87, \
3, 62, 67, 30, 35, 94, 14, 51, 78, 19, 46, 83, 6, 59, 70, 27, 38, 91, 11, 54, 75, 22, 43, 86]

overall_seeds64 = [ \
1, 64, 32, 33, 16, 49, 17, 48, 8, 57, 25, 40, 9,  56, 24, 41, \
4, 61, 29, 36, 13, 52, 20, 45, 5, 60, 28, 37, 12, 53, 21, 44, \
2, 63, 31, 34, 15, 50, 18, 47, 7, 58, 26, 39, 10, 55, 23, 42, \
3, 62, 30, 35, 14, 51, 19, 46, 6, 59, 27, 38, 11, 54, 22, 43]

osbysize = {128: overall_seeds128, 96: overall_seeds96, 64: overall_seeds64}
overall_seeds = osbysize[bracketsize]

#you can paste from outputsongs.txt to this string. By default it will just read from the file but maybe you wan to do this
songstxt = """

"""

if songstxt.isspace():
    f = open("outputsongs.txt", "r")
    rawsongs = f.readlines()
    f.close()
else:
    rawsongs = songstxt.split("\n")
songs = []
i = 0
for rawsong in rawsongs:
    if rawsong.isspace():
        continue
    attributes = rawsong.split("\t") #jankier version of the Song class
    if i < bracketsize:
        attributes.insert(0, overall_seeds[i])
    else:
        attributes.insert(0, i+1)
    i += 1
    songs.append(attributes)


#for challonge if we decide to do that
songs.sort(key=lambda x: int(x[0]))
for attributes in songs:
    print(f'\"{attributes[5]}\" - {attributes[4]} ({attributes[3]} {attributes[2]})')

#same as below but with song info to make it easier to see if things are lined up
songs.sort(key=lambda x: int(x[1]))
for attributes in songs:
    print(f'{attributes[0]}\t\"{attributes[5]}\" - {attributes[4]} ({attributes[3]} {attributes[2]})')

#for the spreadsheet
songs.sort(key=lambda x: int(x[1]))
for attributes in songs:
    print(attributes[0])


'''seeds = [1]
for i in range(1,8):
    newseeds = []
    for j in range(len(seeds)):
        newseeds.append(seeds[j])
        if (2**i - seeds[j] + 1 <= 64):
            newseeds.append(2**i - seeds[j] + 1)
    seeds = newseeds
print(seeds)
for s in seeds:
    print(s)'''
