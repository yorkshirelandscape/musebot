import random, math

year = 1970
bracketsize = 128

#Paste songs in here from the Seeds tab. Columns B through H
songstxt = """1	0	aku chi	1970	25 or 6 to 4	Chicago	https://www.youtube.com/watch?v=iPYH4s7_e34
2	0	aku chi	1970	All Right Now	Free	https://www.youtube.com/watch?v=lSdBtoIIYT4
3	0	bazkitcase5	1970	Up Around The Bend	Creedence Clearwater Revival	https://youtu.be/DX3o1O8ZsTw
4	0	bazkitcase5	1970	Paranoid	Black Sabbath	https://youtu.be/I-ZQZC4lUfk
5	0	Bluey The Bear	1970	The Man Who Sold the World	David Bowie	https://www.youtube.com/watch?v=g33-W9t2q2Q
6	0	Bluey The Bear	1970	My Sweet Lord	George Harrison	https://www.youtube.com/watch?v=SP9wms6oEMo
7	0	Donkey-Dude	1970	Layla	Derek & the Dominos	https://www.youtube.com/watch?v=TngViNw2pOo
8	0	Donkey-Dude	1970	Let It Be	The Beatles	https://www.youtube.com/watch?v=QDYfEBY9NM4
9	0	jsh	1970	War Pigs	Black Sabbath	https://www.youtube.com/watch?v=LQUXuQ6Zd9w
10	0	markusin	1970	Black Magic Woman/Gypsy Queen	Santana	https://www.youtube.com/watch?v=9wT1s96JIb0
11	0	markusin	1970	Moondance	Van Morrison	https://www.youtube.com/watch?v=7kfYOGndVfU
12	0	markusin	1970	With You There to Help Me	Jethro Tull	https://www.youtube.com/watch?v=gfKzPV-Ely4
13	0	Mollo8	1970	Samba Pa Ti	Santana	https://youtu.be/timZoOs9ozo
14	0	MuensterCheese	1970	Immigrant Song	Led Zeppelin	https://youtu.be/5eHkjPCGXKQ
15	0	nottoobad	1970	Wild World	Cat Stevens	https://www.youtube.com/watch?v=jiG7a0q-KYI
16	0	nottoobad	1970	Fire and Rain	James Taylor	https://www.youtube.com/watch?v=N8u8tASPtwg
17	0	nottoobad	1970	Box of Rain	Grateful Dead	https://www.youtube.com/watch?v=lx4msy_rZAI
18	0	pproteus	1970	The Boxer	Simon & Garfunkel	https://www.youtube.com/watch?v=l3LFML_pxlY
19	0	pproteus	1970	Atom Heart Mother	Pink Floyd	https://www.youtube.com/watch?v=uUHb3cBvWMY
20	0	seanahan	1970	Have You Ever Seen the Rain	Creedence Clearwater Revival	https://www.youtube.com/watch?v=Gu2pVPWGYMQ
21	0	Sharur	1970	Midnight Rider	The Allman Brothers Band	https://youtu.be/CoCaPJWqa28
22	0	singletee	1970	Bridge Over Troubled Water	Simon & Garfunkel	https://www.youtube.com/watch?v=4G-YQA_bsOU
23	0	singletee	1970	Teach Your Children	Crosby, Stills, Nash & Young	https://www.youtube.com/watch?v=r72QF7JOQvw
24	0	singletee	1970	Have You Ever Seen the Rain?	Creedence Clearwater Revival	https://www.youtube.com/watch?v=iyf0ZIh3SVo
25	0	tufftaeh	1970	Your Song	Elton John	https://www.youtube.com/watch?v=FT3D1Cu6g10
26	0	volfied	1970	Green-Eyed Lady	Sugarloaf	https://www.youtube.com/watch?v=RYbmls7c8EM
27	0	Volrath	1970	Gallows Pole	Led Zeppelin	https://youtu.be/CmxaT37yeOs
28	0	Wonko	1970	Miles From Nowhere	Cat Stevens	https://youtu.be/fsI5IiHVVXw
29	0	xyrix	1970	I Heard It Through The Grapevine	Creedence Clearwater Revival	https://www.youtube.com/watch?v=bukPjk5zdLc 
30	1	alatar224	1970	No More White Horses	T2	https://www.youtube.com/watch?v=EkF7TQMbo68
31	1	bazkitcase5	1970	Everything Is Beautiful	Ray Stevens	https://youtu.be/F-zhLihVN3U
32	1	Donald X.	1970	Are You Sleeping?	Harry Nilsson	https://www.youtube.com/watch?v=_6rCoShZjjQ
33	1	Donkey-Dude	1970	Wicked World	Black Sabbath	https://www.youtube.com/watch?v=q9_sGE54wo4
34	1	dryope	1970	Misty Canyon	Sven Libaek And His Orchestra	https://youtu.be/6iniYD3sryE
35	1	jsh	1970	Northern Sky	Nick Drake	https://www.youtube.com/watch?v=BBBkFWXiL9Q
36	1	Lemonspawn	1970	Lucretia Mac Evil	Blood, Sweat & Tears	https://youtu.be/CGMGBYfg334
37	1	Mollo8	1970	El triste	José José	https://youtu.be/D42jooB9ghk
38	1	Mort	1970	Then	Yes	https://youtu.be/5lJPJrVz26s
39	1	nottoobad	1970	Don't Let It Bring You Down	Neil Young	https://www.youtube.com/watch?v=eVy1h2FcRiM
40	1	seanahan	1970	Strangers	The Kinks	https://www.youtube.com/watch?v=MR52MIJuZJY
41	1	Sharur	1970	Wade in the Water	Little Sonny	https://youtu.be/tW-ulrOA-CA
42	1	singletee	1970	Trouble	Cat Stevens	https://www.youtube.com/watch?v=7a2A7C3XA2A
43	1	tufftaeh	1970	Gethsemane (I Only Want To Say)	Ian Gillan	https://www.youtube.com/watch?v=tf6yhMynTRo
44	1	volfied	1970	Since I've Been Loving You	Led Zeppelin	https://www.youtube.com/watch?v=vcIem-L398w
45	1	wharf_rat	1970	O-o-h Child	The Five Stairsteps	https://www.youtube.com/watch?v=gIsj8VxQNkw
46	2	alatar224	1970	Swallow Song	Vashti Bunyan	https://www.youtube.com/watch?v=vPRIyJQa_iU
47	2	Bluey The Bear	1970	Ride a White Swan	T. Rex	https://www.youtube.com/watch?v=K_5IQrQ6x04
48	2	Donald X.	1970	Dark Globe	Syd Barrett	https://www.youtube.com/watch?v=xEr6w7P44Nk
49	2	dryope	1970	Walkin' Down The Gloomy Streets...Alone...Broke...Depressed...Gonna Kill Myself Blues	Gil Mellé	https://youtu.be/E6hbfGbH9sU
50	2	jsh	1970	Força bruta	Jorge Ben	https://youtu.be/uVjR30c-AYE
51	2	Lemonspawn	1970	Make Me Smile	Chicago	https://youtu.be/fm4E_mxoamk
52	2	markusin	1970	Southern Man	Neil Young	https://www.youtube.com/watch?v=m5FCcDEA6mY
53	2	Mort	1970	Introduction	Gracious!	https://youtu.be/Mhra6Daq05Q
54	2	MuensterCheese	1970	Pictures of a City	King Crimson	https://youtu.be/EY8lPaA0f9o
55	2	pproteus	1970	Heaven On Their Minds	Andrew Lloyd Webber & Tim Rice	https://www.youtube.com/watch?v=NcWxdbkyCkc
56	2	Sharur	1970	It Brings a Tear	Audience	https://youtu.be/Mz0yecAmXS0
57	2	tufftaeh	1970	Speed King	Deep Purple	https://www.youtube.com/watch?v=W_jfHvcAXRY
58	2	volfied	1970	The Seeker	The Who	https://www.youtube.com/watch?v=UAbzlj3nf4E
59	2	Volrath	1970	Roadhouse Blues	The Doors	https://youtu.be/n2_X4VTCoEo
60	2	wharf_rat	1970	Friend of the Devil	Grateful Dead	https://www.youtube.com/watch?v=6uWwSJ0OCsM
61	2	Wonko	1970	To Beat The Devil	Kris Kristofferson	https://youtu.be/faF0wOsVucw
62	2	xyrix	1970	Morse	Som Imaginário 	https://www.youtube.com/watch?v=jxFrjtxk5iU 
63	3	aku chi	1970	Sunny Road to Salina (Road to Salina)	Christophe	https://www.youtube.com/watch?v=nqu0LdNhJls
64	3	alatar224	1970	Naü Ektila	Magma	https://www.youtube.com/watch?v=ime7DgdTPLY
65	3	bazkitcase5	1970	To Cry You a Song	Jethro Tull	https://youtu.be/S5vto70Q23E
66	3	Bluey The Bear	1970	Down on the Street	The Stooges	https://www.youtube.com/watch?v=xEcLZ5x4WDs
67	3	Donald X.	1970	9 to 5 Pollution Blues	The World	https://www.youtube.com/watch?v=NlqDLestH84
68	3	Donkey-Dude	1970	Black Sabbath	Black Sabbath	https://www.youtube.com/watch?v=ISXnYu-Or4w
69	3	dryope	1970	Fragment of Fear	Johnny Harris	https://youtu.be/usnlPDLVFpI
70	3	jsh	1970	Ripple	Grateful Dead	https://www.youtube.com/watch?v=n8Zb55njp8E
71	3	Lemonspawn	1970	Fire and Water	Free	https://youtu.be/khMURIbXV9g
72	3	Mollo8	1970	We've Only Just Begun	The Carpenters 	https://youtu.be/pAYiSb9rens
73	3	MuensterCheese	1970	The Wizard	Black Sabbath	https://youtu.be/69rU9ajij10
74	3	pproteus	1970	The Width Of A Circle	David Bowie	https://www.youtube.com/watch?app=desktop&v=pnRNAIQAc50
75	3	seanahan	1970	The Only Living Boy in New York	Simon & Garfunkel	https://www.youtube.com/watch?v=5biEjyXNa2o
76	3	Sharur	1970	What?	The Move	https://youtu.be/Q3S-U6jJjD0
77	3	Volrath	1970	Run Through The Jungle	Creedence Clearwater Revival	https://youtu.be/EbI0cMyyw_M
78	3	wharf_rat	1970	Brokedown Palace	Grateful Dead	https://www.youtube.com/watch?v=V3cNVAcfQLA
79	3	Wonko	1970	Don't Let The Green Grass Fool Ya	Wilson Pickett	https://youtu.be/LCl0HPyrdQg
80	3	xyrix	1970	Zanzibar 	Edu Lobo 	https://www.youtube.com/watch?v=0IfFu1c3BMg 
81	4	aku chi	1970	Ohio	Crosby, Stills, Nash & Young	https://www.youtube.com/watch?v=l1PrUU2S_iw
82	4	alatar224	1970	What Did I Say About the Box, Jack?	If	https://www.youtube.com/watch?v=XvqThvuUR68
83	4	bazkitcase5	1970	Lucky Man	Emerson, Lake & Palmer	https://youtu.be/NyV1WCm1_hM
84	4	Bluey The Bear	1970	Into the Mystic	Van Morrison	https://www.youtube.com/watch?v=pbZf8GY1-Ag
85	4	Donald X.	1970	Out Where the Hills	Seatrain	https://www.youtube.com/watch?v=QyJGW9GZziE
86	4	dryope	1970	Stepping Stones	Johnny Harris	https://youtu.be/kx_AtnvrSxg
87	4	jsh	1970	The Man in Me	Bob Dylan	https://www.youtube.com/watch?v=G6oBqDkNz38
88	4	Lemonspawn	1970	Lola	The Kinks	https://youtu.be/LFeqkIH80NE
89	4	Mollo8	1970	Make It With You	Bread	https://youtu.be/ndY9yaSwnxM
90	4	nottoobad	1970	Carry On	Crosby, Stills, Nash & Young	https://www.youtube.com/watch?v=EYl6nVr3aSI
91	4	pproteus	1970	Free Your Mind And Your Ass Will Follow	Funkadelic	https://www.youtube.com/watch?v=Yw4lqwh5c1g
92	4	seanahan	1970	Only Love Can Break Your Heart	Neil Young	https://www.youtube.com/watch?v=GsSHPc-tBms
93	4	Sharur	1970	Amos Moses	Jerry Reed	https://youtu.be/PbXFHSa4YmQ
94	4	tufftaeh	1970	She Came In Through The Bathroom Window	Joe Cocker	https://www.youtube.com/watch?v=hQTyPU9-FXQ
95	4	volfied	1970	White Mountain	Genesis	https://www.youtube.com/watch?v=6hgYH3-HVrY
96	4	Volrath	1970	American Woman	The Guess Who	 https://youtu.be/9uf6EY2BZBw
97	4	wharf_rat	1970	Stage Fright	The Band	https://www.youtube.com/watch?v=NZMfZe7OFFk
98	4	Wonko	1970	Sunday Sermon	Booker T & the M.G.s	https://youtu.be/MZeO2FY67LQ
99	4	xyrix	1970	E.V.A.	Jean-Jacques Perrey 	https://www.youtube.com/watch?v=dXTGN_St-ho 
100	5	aku chi	1970	Who'll Stop The Rain	Creedence Clearwater Revival	https://www.youtube.com/watch?v=T9MXNbpXQ3g
101	5	alatar224	1970	Squeet	May Blitz	https://www.youtube.com/watch?v=BNPcyAedAWk
102	5	Donald X.	1970	Sweet Jane	The Velvet Underground	https://www.youtube.com/watch?v=nkumhBVPGdg
103	5	Donkey-Dude	1970	ABC	The Jackson 5	https://www.youtube.com/watch?v=X0Ph9Tc8tUw
104	5	dryope	1970	Dodesukaden	Toru Takemitsu	https://youtu.be/vEWSK9N4Tqo
105	5	jsh	1970	Move On Up	Curtis Mayfield	https://www.youtube.com/watch?v=6Z66wVo7uNw
106	5	Lemonspawn	1970	Get Up (I Feel Like Being a) Sex Machine	James Brown	https://youtu.be/JOD-M7WZkZQ
107	5	markusin	1970	Viens Tous Les Soirs	Nino Ferrer	https://www.youtube.com/watch?v=dBj-BLjHOJc
108	5	Mollo8	1970	I'm Your Captain (Closer to home) 	Grand Funk Railroad	https://youtu.be/mmG1sjsv8fo
109	5	seanahan	1970	Castles in the Air	Don McLean	https://www.youtube.com/watch?v=TI9NjQK_xm8
110	5	Sharur	1970	Rock and Roll, Hoochie Koo	Johnny Winter	https://youtu.be/4rN8raAgkMo
111	5	singletee	1970	Superstar	Murray Head and The Trinidad Singers	https://www.youtube.com/watch?v=gcekqH2FFhw
112	5	tufftaeh	1970	Across the Universe	The Beatles	https://www.youtube.com/watch?v=90M60PzmxEE
113	5	volfied	1970	Glad	Traffic	https://www.youtube.com/watch?v=mDwbO_aWu9Q
114	5	Volrath	1970	All The Madmen	David Bowie	https://youtu.be/KrlvgARHdzc
115	5	wharf_rat	1970	Darling Dear	The Jackson 5	https://www.youtube.com/watch?v=wKCrcZc0sWU
116	5	Wonko	1970	Where Do The Children Play	Cat Stevens	https://youtu.be/gXDjnPvnDyE
117	5	xyrix	1970	The Boxer 	Simon & Garfunkel	https://www.youtube.com/watch?v=l3LFML_pxlY
118	6	alatar224	1970	Nasty Sex	La Revolución de Emiliano Zapata	https://www.youtube.com/watch?v=_mb0xL2Y2b8
119	6	Bluey The Bear	1970	The Falconer	Nico	https://www.youtube.com/watch?v=85UN7BVkcYg
120	6	Donald X.	1970	After the Gold Rush	Neil Young	https://www.youtube.com/watch?v=d6Zf4D1tHdw
121	6	dryope	1970	Expectations	Sven Libaek And His Orchestra	https://youtu.be/X1d5a6jsDRE
122	6	markusin	1970	Mississippi Queen	Mountain	https://www.youtube.com/watch?v=VbP4qf8PjfI
123	6	Mollo8	1970	Mi árbol y yo	Alberto Cortez	https://youtu.be/bxKEYWc4Ubw
124	6	nottoobad	1970	Cecilia	Simon & Garfunkel	https://www.youtube.com/watch?v=e5uei2AFEaQ
125	6	pproteus	1970	The Silent Boatman	Parliament	https://www.youtube.com/watch?v=_CK8KPh167g
126	6	singletee	1970	Father and Son	Cat Stevens	https://www.youtube.com/watch?v=ZxjTC0bmKls
127	6	tufftaeh	1970	Blues Power (live, from Just One Night)	Eric Clapton	https://www.youtube.com/watch?v=2pQE5IN5hPE
128	6	volfied	1970	Woodstock	Crosby, Stills, Nash & Young	https://www.youtube.com/watch?v=4lx86B6a3kc"""

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
    def spreadsheetstr(self):
        #This is called "spreadsheet" but really it's for the other program
        return f"{self.defaultseed}\t{self.seed}\t{self.submitter}\t{year}\t{self.name}\t{self.artist}"
    def __str__(self):
        #More human-friendly, use for Challonge or things not being fed into a program
        return f"\"{self.name}\" - {self.artist} ({self.submitter} {self.seed})"

allsongs = []
totalseedcounts = [0, 0, 0, 0, 0, 0, 0] #How many 0, 1, 2, ... seeds there are including alternates
rawsongs = songstxt.split("\n")
for rawsong in rawsongs:
    attributes = rawsong.split("\t")
    newsong = Song(attributes[4], attributes[5], attributes[2], int(attributes[1]), attributes[6], int(attributes[0]))
    if len(attributes) > 8:
        newsong.duplicates.extend(attributes[8].split("~")) #for something I haven't impemented yet
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
            seed_dists[i][0] += 1  # then increment the quarter's 0 seet count
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


output = open("seeding/outputsongs.txt", "w")

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
            printandwrite() #breaks it up o it's not just a giant text block
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
