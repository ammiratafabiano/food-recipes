const evTo = 0;
const prevKind = 'separator';
const prevDay = 'M';
const elemDay = 'T';

const previous = evTo > 0 ? {kind: prevKind, day: prevDay} : undefined;
const newDay = evTo > 0 && previous?.kind === 'separator' ? previous.day : elemDay;
console.log(newDay);
