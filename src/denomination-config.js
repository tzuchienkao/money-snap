// src/denomination-config.js
// 面額設定管理模組
// Export: DEFAULT_DENOMINATIONS, DEFAULT_ACTIVE_DENOMINATIONS,
//         loadDenomConfig, saveDenomConfig, getActiveDenominations,
//         setActiveDenominations, toggleSaveAsDefault

/**
 * @typedef {Object} DenominationConfig
 * @property {boolean} enabled - 是否啟用自訂面額設定 (v0.4.0)
 * @property {number[]} activeDenominations - 目前啟用的面額清單 (由大至小排序)
 * @property {boolean} saveAsDefault - 是否儲存為使用者預設偏好
 */

/**
 * 預設流通面額清單 (依面額由大至小排序)
 * 包含所有台幣流通面額：紙鈔 (2000/1000/500/200/100) + 硬幣 (50/20/10/5/1)
 */
export const DEFAULT_DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 1];

/**
 * 預設啟用面額清單 (排除罕見的 2000/200 元鈔票與 20 元硬幣)
 * 這是財務人員最常用的面額組合
 */
export const DEFAULT_ACTIVE_DENOMINATIONS = [1000, 500, 100, 50, 10, 5, 1];

/**
 * localStorage 儲存鍵名 (v0.4.0 版本)
 */
const STORAGE_KEY = 'money_snap_denom_config_v4';

/**
 * 目前的面額設定（記憶體快取）
 * @type {DenominationConfig}
 */
let currentConfig = {
  enabled: false,
  activeDenominations: [...DEFAULT_ACTIVE_DENOMINATIONS],
  saveAsDefault: false
};

/**
 * 從 localStorage 載入面額設定
 * 若無儲存記錄或解析失敗，則回傳預設設定
 * 
 * @returns {DenominationConfig} 面額設定物件
 * 
 * @example
 * const config = loadDenomConfig();
 * // => { activeDenominations: [1000,500,100,50,10,5,1], saveAsDefault: false }
 */
export function loadDenomConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // 無儲存記錄，使用預設設定
      currentConfig = {
        enabled: false,
        activeDenominations: [...DEFAULT_ACTIVE_DENOMINATIONS],
        saveAsDefault: false
      };
      return currentConfig;
    }
    
    const parsed = JSON.parse(raw);
    
    // 驗證資料結構
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid config structure');
    }
    
    // 驗證 activeDenominations 是否為陣列且包含有效面額
    if (!Array.isArray(parsed.activeDenominations) || parsed.activeDenominations.length === 0) {
      throw new Error('Invalid activeDenominations');
    }
    
    // 過濾無效面額（必須在 DEFAULT_DENOMINATIONS 中）
    const validDenoms = parsed.activeDenominations.filter(d => DEFAULT_DENOMINATIONS.includes(d));
    
    if (validDenoms.length === 0) {
      throw new Error('No valid denominations found');
    }
    
    // 確保由大至小排序
    validDenoms.sort((a, b) => b - a);
    
    currentConfig = {
      enabled: Boolean(parsed.enabled),
      activeDenominations: validDenoms,
      saveAsDefault: Boolean(parsed.saveAsDefault)
    };
    
    return currentConfig;
  } catch (e) {
    console.warn('[DenomConfig] Failed to load config from localStorage, using defaults:', e);
    currentConfig = {
      enabled: false,
      activeDenominations: [...DEFAULT_ACTIVE_DENOMINATIONS],
      saveAsDefault: false
    };
    return currentConfig;
  }
}

/**
 * 儲存面額設定至 localStorage
 * 僅在 saveAsDefault 為 true 時執行實際儲存
 * 
 * @param {DenominationConfig} config - 面額設定物件
 * @returns {boolean} 儲存是否成功
 * 
 * @example
 * saveDenomConfig({
 *   activeDenominations: [1000, 100, 10, 1],
 *   saveAsDefault: true
 * });
 */
export function saveDenomConfig(config) {
  try {
    // 僅在啟用「記住偏好」時才儲存
    if (!config.saveAsDefault) {
      // 若使用者取消「記住偏好」，則清除 localStorage 記錄
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    
    // 驗證資料結構
    if (!config || !Array.isArray(config.activeDenominations)) {
      throw new Error('Invalid config structure');
    }
    
    // 確保由大至小排序後再儲存
    const sortedDenoms = [...config.activeDenominations].sort((a, b) => b - a);
    
    const toSave = {
      enabled: Boolean(config.enabled),
      activeDenominations: sortedDenoms,
      saveAsDefault: Boolean(config.saveAsDefault)
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    currentConfig = toSave;
    return true;
  } catch (e) {
    console.error('[DenomConfig] Failed to save config to localStorage:', e);
    return false;
  }
}

/**
 * 取得當前啟用的面額陣列（由大至小排序）
 * 
 * @returns {number[]} 啟用的面額陣列
 * 
 * @example
 * const activeDenoms = getActiveDenominations();
 * // => [1000, 500, 100, 50, 10, 5, 1]
 */
export function getActiveDenominations() {
  return [...currentConfig.activeDenominations];
}

/**
 * 更新當前啟用的面額陣列
 * 自動排序並更新記憶體快取
 * 若啟用「記住偏好」，則同步儲存至 localStorage
 * 
 * @param {number[]} denoms - 新的啟用面額陣列
 * @returns {boolean} 更新是否成功
 * 
 * @example
 * setActiveDenominations([1000, 100, 10, 1]); // 排除 500/50/5
 */
export function setActiveDenominations(denoms) {
  try {
    // 驗證輸入
    if (!Array.isArray(denoms) || denoms.length === 0) {
      throw new Error('Invalid denominations array');
    }
    
    // 過濾無效面額
    const validDenoms = denoms.filter(d => DEFAULT_DENOMINATIONS.includes(d));
    
    if (validDenoms.length === 0) {
      throw new Error('No valid denominations provided');
    }
    
    // 確保由大至小排序
    validDenoms.sort((a, b) => b - a);
    
    // 更新記憶體快取
    currentConfig.activeDenominations = validDenoms;
    
    // 若啟用「記住偏好」，同步儲存至 localStorage
    if (currentConfig.saveAsDefault) {
      saveDenomConfig(currentConfig);
    }
    
    return true;
  } catch (e) {
    console.error('[DenomConfig] Failed to set active denominations:', e);
    return false;
  }
}

/**
 * 切換「記住偏好」選項
 * 
 * @param {boolean} enabled - 是否啟用記住偏好
 * @returns {boolean} 操作是否成功
 * 
 * @example
 * toggleSaveAsDefault(true);  // 啟用記住偏好
 * toggleSaveAsDefault(false); // 停用記住偏好（清除 localStorage）
 */
export function toggleSaveAsDefault(enabled) {
  try {
    currentConfig.saveAsDefault = Boolean(enabled);
    
    // 立即同步儲存狀態
    saveDenomConfig(currentConfig);
    
    return true;
  } catch (e) {
    console.error('[DenomConfig] Failed to toggle saveAsDefault:', e);
    return false;
  }
}

/**
 * 取得當前完整設定物件（唯讀副本）
 * 
 * @returns {DenominationConfig} 當前設定物件的副本
 */
export function getCurrentConfig() {
  return {
    activeDenominations: [...currentConfig.activeDenominations],
    saveAsDefault: currentConfig.saveAsDefault
  };
}

/**
 * 重置為預設設定
 * 
 * @returns {boolean} 重置是否成功
 */
export function resetToDefaults() {
  currentConfig = {
    activeDenominations: [...DEFAULT_ACTIVE_DENOMINATIONS],
    saveAsDefault: false
  };
  localStorage.removeItem(STORAGE_KEY);
  return true;
}
