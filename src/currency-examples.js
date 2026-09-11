// src/currency-examples.js
// 依語系與幣別產生 UI 提示與範例文案

import { getCurrencyProfile } from './currency.js';
import { t } from './i18n.js';

const EXAMPLE_PRESETS = {
  TWD: {
    named: {
      'zh-TW': [['張三', '18500'], ['李四', '45,800'], ['王五', 'NT$32,000']],
      'en-US': [['Alice', '18500'], ['Bob', '45,800'], ['Carol', 'NT$32,000']]
    },
    unnamed: {
      'zh-TW': ['18500', '45,800', 'NT$32,000'],
      'en-US': ['18500', '45,800', 'NT$32,000']
    }
  },
  USD: {
    named: {
      'zh-TW': [['Alice', '120.50'], ['Bob', '1,245.75'], ['Carol', '$999.99']],
      'en-US': [['Alice', '120.50'], ['Bob', '1,245.75'], ['Carol', '$999.99']]
    },
    unnamed: {
      'zh-TW': ['120.50', '1,245.75', '$999.99'],
      'en-US': ['120.50', '1,245.75', '$999.99']
    }
  },
  JPY: {
    named: {
      'zh-TW': [['佐藤', '45800'], ['鈴木', '32,000'], ['高橋', '¥18,500']],
      'en-US': [['Sato', '45800'], ['Suzuki', '32,000'], ['Takahashi', '¥18,500']]
    },
    unnamed: {
      'zh-TW': ['45800', '32,000', '¥18,500'],
      'en-US': ['45800', '32,000', '¥18,500']
    }
  },
  KRW: {
    named: {
      'zh-TW': [['김민수', '45800'], ['박서준', '32,000'], ['이수진', '₩18,500']],
      'en-US': [['Minsu', '45800'], ['Seo-jun', '32,000'], ['Sujin', '₩18,500']]
    },
    unnamed: {
      'zh-TW': ['45800', '32,000', '₩18,500'],
      'en-US': ['45800', '32,000', '₩18,500']
    }
  },
  CNY: {
    named: {
      'zh-TW': [['张三', '120.50'], ['李四', '1,245.75'], ['王五', '¥999.10']],
      'en-US': [['Zhang San', '120.50'], ['Li Si', '1,245.75'], ['Wang Wu', '¥999.10']]
    },
    unnamed: {
      'zh-TW': ['120.50', '1,245.75', '¥999.10'],
      'en-US': ['120.50', '1,245.75', '¥999.10']
    }
  },
  HKD: {
    named: {
      'zh-TW': [['陳大文', '120.50'], ['李美玲', '1,245.70'], ['王志明', 'HK$999.10']],
      'en-US': [['Chris Chan', '120.50'], ['May Lee', '1,245.70'], ['Alex Wong', 'HK$999.10']]
    },
    unnamed: {
      'zh-TW': ['120.50', '1,245.70', 'HK$999.10'],
      'en-US': ['120.50', '1,245.70', 'HK$999.10']
    }
  },
  EUR: {
    named: {
      'zh-TW': [['Alice', '120.50'], ['Bob', '1,245.75'], ['Carla', '€999.76']],
      'en-US': [['Alice', '120.50'], ['Bob', '1,245.75'], ['Carla', '€999.76']]
    },
    unnamed: {
      'zh-TW': ['120.50', '1,245.75', '€999.76'],
      'en-US': ['120.50', '1,245.75', '€999.76']
    }
  },
  THB: {
    named: {
      'zh-TW': [['Somchai', '120.50'], ['Anong', '1,245.75'], ['Niran', '฿999.25']],
      'en-US': [['Somchai', '120.50'], ['Anong', '1,245.75'], ['Niran', '฿999.25']]
    },
    unnamed: {
      'zh-TW': ['120.50', '1,245.75', '฿999.25'],
      'en-US': ['120.50', '1,245.75', '฿999.25']
    }
  }
};

function getPreset(currencyCode, language) {
  const preset = EXAMPLE_PRESETS[currencyCode] || EXAMPLE_PRESETS.TWD;
  return {
    named: preset.named[language] || preset.named['zh-TW'],
    unnamed: preset.unnamed[language] || preset.unnamed['zh-TW']
  };
}

export function getCurrencyExamples(currencyCode, language = 'zh-TW') {
  const profile = getCurrencyProfile(currencyCode);
  const preset = getPreset(profile.code, language);

  return {
    currencyCode: profile.code,
    namedRows: preset.named,
    unnamedRows: preset.unnamed,
    csvAmountExamples: preset.unnamed.slice(0, 3)
  };
}

export function buildCurrencyAwareCopy(currencyCode, language = 'zh-TW', hasNameFlag = true) {
  const examples = getCurrencyExamples(currencyCode, language);
  const namedPlaceholder = (language === 'en-US' ? 'For example:' : '例如：') +
    `\n${examples.namedRows.map(([name, amount]) => `${name},${amount}`).join('\n')}`;
  const unnamedPlaceholder = (language === 'en-US' ? 'For example:' : '例如：') +
    `\n${examples.unnamedRows.join('\n')}`;
  const csvHintLine1 = hasNameFlag
    ? (language === 'en-US'
      ? `Column 1: Name (required, e.g. ${examples.namedRows[0][0]}) | Column 2: Amount (required, e.g. ${examples.csvAmountExamples.join(' or ')})`
      : `第一欄：姓名（必填，如：${examples.namedRows[0][0]}）｜第二欄：金額（必填，如：${examples.csvAmountExamples.join(' 或 ')})`)
    : (language === 'en-US'
      ? `Amount only mode: enter one amount per line (e.g. ${examples.csvAmountExamples.join(' or ')})`
      : `純金額模式：每行輸入一筆金額（如：${examples.csvAmountExamples.join(' 或 ')})`);
  const namedExampleInline = `${examples.namedRows[0][0]},${examples.namedRows[0][1]}`;
  const unnamedExampleInline = examples.unnamedRows[0];

  return {
    csvHintLine1,
    placeholderNamed: namedPlaceholder,
    placeholderUnnamed: unnamedPlaceholder,
    modeHintNamed: `${t('modeHintNamedBase', {}, language)}\n${language === 'en-US' ? 'Example' : '例如'}：${namedExampleInline}`,
    modeHintUnnamed: `${t('modeHintUnnamedBase', {}, language)}\n${language === 'en-US' ? 'Example' : '例如'}：${unnamedExampleInline}`
  };
}
