import { User } from '../types';

export interface ActiveStatusInfo {
  isOnline: boolean;
  statusTextBN: string;
  statusTextEN: string;
  relativeTimeBN: string;
  relativeTimeEN: string;
}

export function getActiveStatus(lastActive: string | undefined): ActiveStatusInfo {
  if (!lastActive) {
    return {
      isOnline: false,
      statusTextBN: 'অফলাইন',
      statusTextEN: 'Offline',
      relativeTimeBN: 'কখনো সক্রিয় হয়নি',
      relativeTimeEN: 'Never active'
    };
  }

  try {
    const activeDate = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - activeDate.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMin < 1) {
      return {
        isOnline: true,
        statusTextBN: 'অনলাইন',
        statusTextEN: 'Online',
        relativeTimeBN: 'এই মাত্র সক্রিয়',
        relativeTimeEN: 'Just now'
      };
    }

    const bnDigits = (n: number) => n.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);

    if (diffMin < 60) {
      return {
        isOnline: false,
        statusTextBN: 'অফলাইন',
        statusTextEN: 'Offline',
        relativeTimeBN: `${bnDigits(diffMin)} মিনিট আগে`,
        relativeTimeEN: `${diffMin}m ago`
      };
    }

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return {
        isOnline: false,
        statusTextBN: 'অফলাইন',
        statusTextEN: 'Offline',
        relativeTimeBN: `${bnDigits(diffHours)} ঘণ্টা আগে`,
        relativeTimeEN: `${diffHours}h ago`
      };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
      isOnline: false,
      statusTextBN: 'অফলাইন',
      statusTextEN: 'Offline',
      relativeTimeBN: `${bnDigits(diffDays)} দিন আগে`,
      relativeTimeEN: `${diffDays}d ago`
    };
  } catch (err) {
    return {
      isOnline: false,
      statusTextBN: 'অফলাইন',
      statusTextEN: 'Offline',
      relativeTimeBN: 'কিছুক্ষণ আগে',
      relativeTimeEN: 'Some time ago'
    };
  }
}
