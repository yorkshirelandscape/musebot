import random, math

year = 2003
bracketsize = 128

#Paste songs in here from the Seeds tab. Columns B through H
songstxt = """1	0	Volrath	2003	Windowpane	Opeth	https://youtu.be/bSpqLqC7U6g
2	0	Bluey The Bear	2003	There There (The Boney King of Nowhere)	Radiohead	https://www.youtube.com/watch?v=Z2aH-sluR5s
3	0	wharf_rat	2003	Transdermal Celebration	Ween	https://www.youtube.com/watch?v=Nt9uNomdCHg
4	0	Volrath	2003	Seven Nation Army	The White Stripes	https://youtu.be/RDuzszjrdcc
5	0	Sharur	2003	Instrumental Illness	The Allman Brothers Band	https://youtu.be/Z1_6HPpTuuU
6	0	bazkitcase5	2003	Bring Me To Life	Evanescence	https://youtu.be/-eGM0IJc70Y
7	0	seanahan	2003	Maps	Yeah Yeah Yeahs	https://www.youtube.com/watch?v=UKRo86ccTtY
8	0	tufftaeh	2003	The Closest Thing to Crazy	Katie Melua	https://www.youtube.com/watch?v=a3C4Efws8QU
9	0	seanahan	2003	Red Right Ankle	The Decemberists	https://www.youtube.com/watch?v=axkyYrismAw
10	1	Mort	2003	Hope Leaves	Opeth	https://youtu.be/cGPRoszjnWA
11	1	threelinewhip	2003	Deadhead	The Devin Townsend Band	https://www.youtube.com/watch?v=2_vOX3s9f_w
12	1	seanahan	2003	The Quiet Things That No One Ever Knows	Brand New	https://www.youtube.com/watch?v=MB6ESvoBwxI
13	1	Donkey-Dude	2003	Put Up Or Shut Up	Gang Starr	https://www.youtube.com/watch?v=A-WdRSfC0kU
14	1	aku chi	2003	Mr. Brightside	The Killers	https://www.youtube.com/watch?v=m2zUrruKjDQ
15	1	wharf_rat	2003	Tweezer | 2/28/03 | Uniondale, NY	Phish	https://www.youtube.com/watch?v=25GWjze0WlU
16	1	Donald X.	2003	Title and Registration	Death Cab for Cutie	https://www.youtube.com/watch?v=KGEyqP0744c
17	1	Sharur	2003	Hardware Store	"Weird Al" Yankovic	https://youtu.be/DFI6cV9slfI
18	1	dryope	2003	Sparkling Truth	Dhafer Youssef	https://youtu.be/qZ_6tQ62KHQ
19	1	xyrix	2003	Easy Lee	Ricardo Villalobos	https://www.youtube.com/watch?v=JvoipeZSh6k 
20	1	Dgdanp	2003	A Favor House Atlantic	Coheed and Cambria	https://m.youtube.com/watch?v=IcrCoHFUML0
21	1	alatar224	2003	Ridiculosous	Electrocution 250	https://www.youtube.com/watch?v=nGRpahTo5xw
22	1	nottoobad	2003	Passenger Seat	Death Cab for Cutie	https://www.youtube.com/watch?v=J0Iv4onsrIE
23	1	Valendale	2003	J'en ai marre!	Alizée	https://youtu.be/HeWF_fy8tLE
24	1	bazkitcase5	2003	Who's Gonna Save Us	The Living End	https://youtu.be/NWX2c1yNfaM
25	1	Mollo8	2003	Eyes Wide Open	King Crimson	https://youtu.be/92ldx4Ze8RA
26	1	markusin	2003	Trogdor	Strong Bad	https://www.youtube.com/watch?v=HjAmB6vDGmI
27	1	singletee	2003	Strict Machine	Goldfrapp	https://www.youtube.com/watch?v=zU51JiFYhY4
28	1	Wonko	2003	Art is Hard	Cursive	https://youtu.be/AoNA-MkygH8
29	1	Lemonspawn	2003	Defying Gravity	Idina Menzel, Kristin Chenoweth	https://youtu.be/fEq3xM-i0Ng
30	1	volfied	2003	House of Jealous Lovers	The Rapture	https://www.youtube.com/watch?v=C_l4b6xEUCM
31	1	sweetjohn33	2003	The Fine Print	King Geedorah	https://youtu.be/e4dsyKNEb-c
32	1	pproteus	2003	Where Is The Love?	The Black Eyed Peas	https://www.youtube.com/watch?v=PZj_I0DBtKU
33	1	jsh	2003	Black Cab	Jens Lekman	https://www.youtube.com/watch?v=vdX0nf8nzDM
34	6	Donkey-Dude	2003	Skills	Gang Starr	https://www.youtube.com/watch?v=S1y3UVmmFMo
35	2	alatar224	2003	I Got My Eyes on You	Robert Belfour	https://www.youtube.com/watch?v=5UmT9O_RNrQ
36	2	tufftaeh	2003	Picture Of Innocence	Deep Purple	https://www.youtube.com/watch?v=FAxq8SUKccs
37	2	wharf_rat	2003	I Saw A Hippie Girl On 8th Avenue	Jeffrey Lewis	https://www.youtube.com/watch?v=vJKbPLVswmY
38	2	dryope	2003	Sogeki-syu	Susumu Hirasawa	https://youtu.be/an2VLnLfzP0
39	2	threelinewhip	2003	Away	The Devin Townsend Band	https://www.youtube.com/watch?v=oEJJxPgwkzA
40	2	Bluey The Bear	2003	迷彩 [Meisai]	Sheena Ringo	https://www.youtube.com/watch?v=WbUNBDizSIQ
41	0	Donkey-Dude	2003	X Gon' Give It To Ya	DMX	https://www.youtube.com/watch?v=ChUUcW4aw2k
42	2	bazkitcase5	2003	Dare You To Move	Switchfoot	https://youtu.be/B5Gvdgs_R1c
43	2	Valendale	2003	Breaking the Habit	Linkin Park	https://youtu.be/_e7bqZGPyFI
44	2	aku chi	2003	Hands Down	Dashboard Confessional	https://www.youtube.com/watch?v=V_4qNnbbtsY
45	2	nottoobad	2003	Far From Any Road	The Handsome Family	https://www.youtube.com/watch?v=TRJ_s2G76Hg
46	2	Donald X.	2003	All For Swinging You Around	The New Pornographers	https://www.youtube.com/watch?v=PaFEPctPebE
47	2	Wonko	2003	Flim	The Bad Plus	https://youtu.be/HeMre0Sp7o4
48	2	markusin	2003	Sing for Absolution	Muse	https://www.youtube.com/watch?v=xDOwjPWCU3g
49	2	xyrix	2003	Hustle Rose	Metric	https://www.youtube.com/watch?v=A_UFawnJwOc
50	2	Sharur	2003	The White Tree	Howard Shore	https://youtu.be/kbf94uPFXNA
51	2	Dgdanp	2003	Weapon	Mathew Good	https://m.youtube.com/watch?v=XOee1xTUubc
52	2	volfied	2003	Gay Bar	Electric Six	https://www.youtube.com/watch?v=J04sfXbS2PA
53	2	jsh	2003	The First Single	The Format	https://www.youtube.com/watch?v=irSF0OGDX5k
54	2	Mort	2003	I am the Morning	Oceansize	https://youtu.be/_-bT4hcfoRw
55	2	Mollo8	2003	Rucci	Austin TV	https://youtu.be/beJ92hKfSG0
56	2	sweetjohn33	2003	Anti-Matter	King Geedorah	https://youtu.be/BU0KjU2o0lA
57	2	singletee	2003	Toxic	Britney Spears	https://www.youtube.com/watch?v=tVdr_JWmnsA
58	2	pproteus	2003	Reptilia	The Strokes	https://www.youtube.com/watch?v=h-GJOlf9HtE
59	2	Lemonspawn	2003	My Coco	stellastarr*	https://youtu.be/RZTVm8ouBBQ
60	3	Bluey The Bear	2003	New Killer Star	David Bowie	https://www.youtube.com/watch?v=aiJ0CoVsEm0
61	3	threelinewhip	2003	Go To Sleep	Radiohead	https://www.youtube.com/watch?v=6qn5SfmkbKE
62	3	seanahan	2003	Vehicles and Animals	Athlete	https://www.youtube.com/watch?v=WUVSrkcZMf4
63	3	Donald X.	2003	Bouncer's Conversation	Liz Phair	https://www.youtube.com/watch?v=sscPyQLQRI0
64	3	Mort	2003	Honor Thy Father	Dream Theater	https://youtu.be/P_8brIcOiG8
65	3	wharf_rat	2003	Hunting Wabbits	Gordon Goodwin's Big Phat Band	https://www.youtube.com/watch?v=Ai-SuZUYOH8
66	3	nottoobad	2003	Callin' Out	Lyrics Born	https://www.youtube.com/watch?v=gL-xQbb5BaM
67	2	Volrath	2003	I Don't Wanna Be Me	Type O Negative	https://youtu.be/A8rpm0Eue-o
68	3	xyrix	2003	Galang	M.I.A.	https://www.youtube.com/watch?v=7rg4u3byLcs
69	3	markusin	2003	Missouri Loves Company	Ringo Starr	https://www.youtube.com/watch?v=_ETe32_q0VY
70	3	Donkey-Dude	2003	In My Time of Need	Opeth	https://www.youtube.com/watch?v=razzBeBLDG4
71	3	volfied	2003	Gravedigger	Dave Matthews	https://www.youtube.com/watch?v=-XtjGR46hEU
72	3	dryope	2003	Tensor	Carbon Based Lifeforms	https://youtu.be/aibZkcOsmcE
73	3	Valendale	2003	Angry White Polka	Weird Al Yankovic	https://youtu.be/BeklDFFg6p8
74	3	alatar224	2003	No Trust	The Black Keys	https://www.youtube.com/watch?v=R-AKSxqHhOE
75	3	tufftaeh	2003	Did I Say That?	Meat Loaf	https://www.youtube.com/watch?v=6HBd-TZnH2o
76	3	singletee	2003	We Will Become Silhouettes	The Postal Service	https://www.youtube.com/watch?v=pp2N2u4uAg4
77	3	pproteus	2003	Orca	Wintersleep	https://www.youtube.com/watch?v=2e2e3QU4ft0
78	3	sweetjohn33	2003	Lady Brown	Nujabes	https://youtu.be/V8Xh5ErjIyM
79	3	Dgdanp	2003	Dream to Make Believe	Armor For Sleep	https://m.youtube.com/watch?v=KHKGeoVOIPE
80	3	aku chi	2003	Why Can't I?	Liz Phair	https://www.youtube.com/watch?v=Rtm9xNKfgd0
81	3	Wonko	2003	True To Myself	Ziggy Marley	https://youtu.be/c_ac824FUU8
82	3	Lemonspawn	2003	Now It's On	Grandaddy	https://youtu.be/lJCSJhYbFHQ
83	3	jsh	2003	Piazza, New York Catcher	Belle & Sebastian	https://www.youtube.com/watch?v=QXiRbf-4RXc
84	3	Mollo8	2003	The Paper-Hearted Ghost	Chamber	https://youtu.be/WNgl3VkjdGQ
85	3	bazkitcase5	2003	Your Mistake	Sister Hazel	https://youtu.be/PzRc8Xc6uB0
86	3	Sharur	2003	Lucy Mae Blues	Buddy Guy	https://youtu.be/AADvGVLClpc
87	4	Donkey-Dude	2003	Son et Lumiere / Inertiatic Esp	The Mars Volta	https://www.youtube.com/watch?v=f4ntjKcRh8w
88	4	threelinewhip	2003	A Room and a Riddle	Hammers of Misfortune	https://www.youtube.com/watch?v=qmKTaMry1V4
89	4	alatar224	2003	Siam vs. Mexico (The Saddest Music in the World)	Xio Nan Wang, The Mini-Mariachis	https://www.youtube.com/watch?v=v6S6TPVLuYw
90	4	xyrix	2003	Chump Change	The New Pornographers	https://www.youtube.com/watch?v=i1VQwpjyrXU
91	4	Bluey The Bear	2003	The Hardest Button to Button	The White Stripes	https://www.youtube.com/watch?v=N3ceE43AHyw
92	4	Mort	2003	The Noose	A Perfect Circle	https://youtu.be/ngZvHBUdYYY
93	5	Dgdanp	2003	I Hate Everything About You	Three Days Grace	https://m.youtube.com/watch?v=gqbQuypKCCU
94	4	markusin	2003	Homer's Day (The Simpsons: Hit & Run)	Marc Baril, Allan Levy, and Jeff Tymoschuk	https://www.youtube.com/watch?v=7u65WiPxZKc
95	4	tufftaeh	2003	Tear Off Your Own Head	The Bangles	https://www.youtube.com/watch?v=FwVvf_8oWFk
96	0	sweetjohn33	2003	Meant to Live	Switchfoot	https://youtu.be/OXcrEVFZOXs
97	4	nottoobad	2003	White Flag	Dido	https://www.youtube.com/watch?v=jRqhGC5vgC0
98	4	aku chi	2003	Hysteria	Muse	https://www.youtube.com/watch?v=27zOar_iEOA
99	4	Sharur	2003	Have Love, Will Travel	The Black Keys	https://youtu.be/EqGJyffCyow
100	4	Valendale	2003	Another Joe	Masami Ueda & Masakazu Sugimori	https://youtu.be/_OjJ_64d_vU
101	4	Donald X.	2003	Genius In France	Weird Al Yankovic	https://www.youtube.com/watch?v=ZwFf9vGRqcs
102	4	Wonko	2003	Give Me a Try	Sizzla	https://youtu.be/55Iv_y1SxgU
103	4	singletee	2003	As the Rush Comes	Motorcycle	https://www.youtube.com/watch?v=Bi2dYFk65uw
104	4	Lemonspawn	2003	Kissing the Lipless	The Shins	https://youtu.be/ffQji-kJ7Tg
105	4	volfied	2003	Loneliness	Annie Lennox	https://www.youtube.com/watch?v=twUPnqQRaUA
106	4	jsh	2003	O Vencedor	Los Hermanos	https://www.youtube.com/watch?v=9mXBTKKXCQU
107	4	pproteus	2003	Romulus	Sufjan Stevens	https://www.youtube.com/watch?v=KOuepo6DP4k
108	4	dryope	2003	Revelation	Irfan	https://youtu.be/Bg0OOwEozcg
109	4	bazkitcase5	2003	So Far Away	Staind	https://youtu.be/vTxFQGb3Op4
110	4	Mollo8	2003	Sin Aliento	Santa Sabina	https://youtu.be/ZpiX-7cIzSc
111	5	volfied	2003	Out of Time	Blur	https://www.youtube.com/watch?v=WPMgj1xMvX4
112	5	jsh	2003	Black Math	The White Stripes	https://www.youtube.com/watch?v=WMbL2K3xVEM
113	5	Valendale	2003	Faint	Linkin Park	https://youtu.be/yOW7Eh81Gto
114	5	pproteus	2003	Slipping Husband	The National	https://www.youtube.com/watch?v=YELOZayRHrc
115	5	singletee	2003	Loreley	Blackmore's Night	https://www.youtube.com/watch?v=tUhmjmkLnxY
116	5	dryope	2003	Seventh Heaven Suite	Dhafer Youssef	https://youtu.be/FzdfHp1hss0
117	5	Mollo8	2003	Hey! Amigo!	Alizée	https://youtu.be/Asz1lgXsUyo
118	5	alatar224	2003	Total Eclipse of the Heart	The Dan Band	https://www.youtube.com/watch?v=ZRFYAjS-PZM
119	5	Wonko	2003	Heart of Glass	The Bad Plus	https://youtu.be/2zmg_msBtDQ
120	5	aku chi	2003	One Big Holiday	My Morning Jacket	https://www.youtube.com/watch?v=vhd7vOmevWk
121	5	nottoobad	2003	Cavalier Eternal	Against Me!	https://www.youtube.com/watch?v=a0re5ioFPXI
122	5	Donald X.	2003	Us	Regina Spektor	https://www.youtube.com/watch?v=wtejQSAl_NI
123	5	wharf_rat	2003	Vibrate	Outkast	https://www.youtube.com/watch?v=mQlp9Va80A4
124	4	Volrath	2003	Ruin	Lamb Of God	 https://youtu.be/W3QoLh8fKGc
125	5	Sharur	2003	Shadow Boxed	Procol Harum	https://youtu.be/L8wl98Cf-z0
126	5	tufftaeh	2003	Growing On Me	The Darkness	https://www.youtube.com/watch?v=xSP8zikWPDw
127	5	xyrix	2003	Weather Systems	Andrew Bird	https://www.youtube.com/watch?v=1kAKKUk7TSQ 
128	5	Donkey-Dude	2003	Sweet Amber	Metallica	https://www.youtube.com/watch?v=58-AndGTKy0"""

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
