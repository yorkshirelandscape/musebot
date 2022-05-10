const missingVoted = [
  { user: 'yugret', id: '123492862741577728' },
  { user: 'Wonko', id: '129050991516581889' },
  { user: 'quoth', id: '180777442112176128' },
  { user: 'jsh', id: '212657778114822144' },
  { user: 'Valendale', id: '213122118437699584' },
  { user: 'assemble_me', id: '231894050075181057' },
  { user: 'tufftaeh', id: '243074406979469313' },
  { user: 'nottoobad', id: '243190843777875970' },
  { user: 'markusin', id: '249526255551119360' },
  { user: 'aku chi', id: '258397497297207297' },
  { user: 'pproteus', id: '272826977382301696' },
  { user: 'Sharur', id: '286950779187625984' },
  { user: 'threelinewhip', id: '390624515308257281' },
  { user: 'SuperDuper', id: '434314094519123968' },
  { user: 'Donkey-Dude', id: '520369197872578571' },
  { user: 'Komaitho', id: '700079863159324774' },
  { user: 'Mollo8', id: '711095408511942716' },
  { user: 'Volkrath', id: '718819516263432224' },
  { user: 'strumphf', id: '721711867898232922' },
  { user: 'alatar224', id: '807760790244294709' },
  { user: 'biscuitsjoe', id: '842607559922679829' },
];

const notifiedMentions = ['286950779187625984'];

const test = missingVoted.map((mv) => !notifiedMentions.includes(mv.id));

console.log(test);

const test2 = missingVoted.filter((mv) => !notifiedMentions.includes(mv.id));

console.log(test2);

console.log(test);
