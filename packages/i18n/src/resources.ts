import commonEn from "./locales/common/en";
import waitlistEn from "./locales/waitlist/en";
import appEn from "./locales/app/en";

import commonEs from "./locales/common/es";
import waitlistEs from "./locales/waitlist/es";
import appEs from "./locales/app/es";

import commonZhCN from "./locales/common/zh-CN";
import waitlistZhCN from "./locales/waitlist/zh-CN";
import appZhCN from "./locales/app/zh-CN";

import commonZhTW from "./locales/common/zh-TW";
import waitlistZhTW from "./locales/waitlist/zh-TW";
import appZhTW from "./locales/app/zh-TW";

import commonKo from "./locales/common/ko";
import waitlistKo from "./locales/waitlist/ko";
import appKo from "./locales/app/ko";

import commonJa from "./locales/common/ja";
import waitlistJa from "./locales/waitlist/ja";
import appJa from "./locales/app/ja";

import commonPt from "./locales/common/pt";
import waitlistPt from "./locales/waitlist/pt";
import appPt from "./locales/app/pt";

import commonVi from "./locales/common/vi";
import waitlistVi from "./locales/waitlist/vi";
import appVi from "./locales/app/vi";

import commonTr from "./locales/common/tr";
import waitlistTr from "./locales/waitlist/tr";
import appTr from "./locales/app/tr";

// English is the source of truth. Translated locale files are added here as
// they land; i18next falls back to `en` for any locale without a file, so the
// dropdown is fully functional before every translation is written.
export const resources = {
  en: {
    common: commonEn,
    waitlist: waitlistEn,
    app: appEn,
  },
  es: {
    common: commonEs,
    waitlist: waitlistEs,
    app: appEs,
  },
  "zh-CN": {
    common: commonZhCN,
    waitlist: waitlistZhCN,
    app: appZhCN,
  },
  "zh-TW": {
    common: commonZhTW,
    waitlist: waitlistZhTW,
    app: appZhTW,
  },
  ko: {
    common: commonKo,
    waitlist: waitlistKo,
    app: appKo,
  },
  ja: {
    common: commonJa,
    waitlist: waitlistJa,
    app: appJa,
  },
  pt: {
    common: commonPt,
    waitlist: waitlistPt,
    app: appPt,
  },
  vi: {
    common: commonVi,
    waitlist: waitlistVi,
    app: appVi,
  },
  tr: {
    common: commonTr,
    waitlist: waitlistTr,
    app: appTr,
  },
} as const;

export type Resources = typeof resources;