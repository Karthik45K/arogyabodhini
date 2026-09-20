import React from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import './BilingualText.css'

/**
 * BilingualText — always shows English first, native language below.
 *
 * Props:
 *   tKey      {string}  translation key from translations.js
 *   enText    {string}  optional hardcoded English override
 *   className {string}  extra CSS class on wrapper
 *   size      {string}  'sm' | 'md' (default) | 'lg'
 *   as        {string}  wrapper element tag (default 'span')
 */
const BilingualText = ({ tKey, enText, className = '', size = 'md', as: Tag = 'span' }) => {
  const { t, en, lang } = useLanguage()

  const englishLine = enText != null ? enText : en(tKey)
  const nativeLine  = lang?.code && lang.code !== 'en' ? t(tKey) : null

  if (!nativeLine) {
    return (
      <Tag className={`bi-text bi-text--${size} ${className}`}>
        {englishLine}
      </Tag>
    )
  }

  return (
    <Tag className={`bi-text bi-text--${size} ${className}`}>
      <span className="bi-text__en">{englishLine}</span>
      <span className="bi-text__native">{nativeLine}</span>
    </Tag>
  )
}

export default BilingualText
