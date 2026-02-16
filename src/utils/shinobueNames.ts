import type { ShinobueRegister } from '../types/shinobue'

const RO_NAMES = ['筒音', '一', '二', '三', '四', '五', '六', '七'] as const

/**
 * 篠笛の音名を統一フォーマットで返す
 *
 * - 呂音: 筒音, 一, 二, 三, 四, 五, 六, 七
 * - 甲音: 1, 2, 3, 4, 5, 6, 7
 * - 大甲: 大1, 大2, 大3, 大4
 */
export function shinobueDisplayName(register: ShinobueRegister, number: number): string {
  switch (register) {
    case 'ro':
      return RO_NAMES[number] ?? String(number)
    case 'kan':
      return String(number)
    case 'daikan':
      return `大${number}`
  }
}
