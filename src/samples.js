import { CORPUS } from './corpus.js';

function textOf(id) {
  const item = CORPUS.find((entry) => entry.id === id);
  if (!item) {
    throw new Error('Missing sample ' + id);
  }
  return item.text;
}

export const SAMPLES = [
  { title: 'Account will be blocked', text: textOf('T1') },
  { title: 'Bank debit alert', text: textOf('T5') },
  { title: 'Delivery update', text: textOf('T6') },
  { title: 'Parcel held at customs', text: textOf('H7') },
  { title: 'Work-from-home fee', text: textOf('T3') },
  { title: 'Money from "mom"', text: textOf('H9') },
  { title: 'Power will be cut', text: textOf('H2') },
  { title: 'Login code', text: textOf('T7') },
  {
    title: 'Message in Hindi',
    text: 'आपका ExampleBank खाता आज बंद हो जाएगा। अभी अपना KYC अपडेट करें।'
  }
];
