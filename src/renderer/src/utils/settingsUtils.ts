export const DEFAULT_SETTINGS = {
  warningColor10: 'rgba(255, 0, 0, 0.1)',
  warningColor100: 'rgba(255, 255, 0, 0.05)',
  fontSize: 16,
  darkMode: false
}

export const applySettings = (): void => {
  // 从本地存储获取设置，若无则使用默认值
  const warningColor10 = localStorage.getItem('warningColor10') || DEFAULT_SETTINGS.warningColor10
  const warningColor100 =
    localStorage.getItem('warningColor100') || DEFAULT_SETTINGS.warningColor100
  const fontSize = parseInt(
    localStorage.getItem('fontSize') || DEFAULT_SETTINGS.fontSize.toString(),
    10
  )
  const darkMode = localStorage.getItem('darkMode') === 'true' || DEFAULT_SETTINGS.darkMode

  console.log('[Settings] 应用设置:', { warningColor10, warningColor100, fontSize, darkMode })

  // 应用颜色设置到CSS变量
  document.documentElement.style.setProperty('--warning-color-10', warningColor10)
  document.documentElement.style.setProperty('--warning-color-100', warningColor100)

  // 应用字体大小
  document.documentElement.style.fontSize = `${fontSize}px`

  // 应用明暗模式（通过切换类名）
  if (darkMode) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

export const resetSettings = (): void => {
  // 清除本地存储的设置
  localStorage.removeItem('warningColor10')
  localStorage.removeItem('warningColor100')
  localStorage.removeItem('fontSize')
  localStorage.removeItem('darkMode')

  // 应用默认设置
  applySettings()
}
