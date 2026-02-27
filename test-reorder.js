const elementDay = 'M';
const evTo = 0;
const previous = undefined;

let newDay;
if (evTo > 0 && previous?.kind === 'separator') {
  newDay = previous.day;
} else if (evTo === 0) {
  newDay = undefined;
} else {
  newDay = elementDay;
}

console.log(newDay);
