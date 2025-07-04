const needs = [
  'a new job', 'a home', 'peace of mind', 'healing', 'marriage', 'breakthrough',
  'financial favor', 'restoration', 'direction', 'faith', 'wisdom'
];

const reasons = [
  'pays more than what I currently earn',
  'brings me joy and peace',
  'helps me grow spiritually',
  'keeps my family safe',
  'helps me impact others',
  'is aligned with my calling',
  'is better than my current one',
  'gives me balance and clarity',
  'secures my future',
  'strengthens my faith'
];

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomPrayerTitle() {
  return `Prayer for ${randomFrom(needs)}`;
}

export function randomPrayerDescription() {
  return `I want ${randomFrom(needs)} that ${randomFrom(reasons)}.`;
}

export function randomTestimony() {
  return `I want to thank God for ${randomFrom(needs)} and ${randomFrom(reasons)}.`;
}
export function randomComment() {
  return `This really blessed me! I also need ${randomFrom(needs)}.`;
}
