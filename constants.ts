import { Destination } from './types';

export const DESTINATIONS: Destination[] = [
  Destination.OSAKA_KYOTO,
  Destination.TOKYO,
  Destination.FUKUOKA,
];

export const DESTINATION_AIRPORTS: { [key in Destination]: string } = {
    [Destination.OSAKA_KYOTO]: 'KIX', // 간사이 국제공항
    [Destination.TOKYO]: 'NRT',       // 나리타 국제공항
    [Destination.FUKUOKA]: 'FUK',     // 후쿠오카 공항
};
