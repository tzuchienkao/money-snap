// src/config.js
// Centralized configuration for limits and constants

/**
 * 輸入資料的最大筆數限制
 * 
 * 超過此限制將拒絕處理並回傳錯誤訊息
 * @constant {number}
 */
export const MAX_ENTRIES = 1000; // maximum number of input lines

/**
 * 單筆金額的整數部分上限
 * 
 * 每筆金額不得超過此值（適用於個別輸入項目）
 * @constant {number}
 */
export const MAX_PER_ENTRY = 999999; // max integer part per entry (6 digits)

/**
 * 單一人員加總後的金額上限
 * 
 * 同名項目合併加總後不得超過此值
 * @constant {number}
 */
export const MAX_PER_PERSON = 999999999; // max per-person total

/**
 * 所有金額的總和上限
 * 
 * 全部資料的總金額不得超過此值
 * @constant {number}
 */
export const MAX_TOTAL = 9999999999; // overall total cap
