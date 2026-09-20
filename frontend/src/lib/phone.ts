const phonePattern = /^\+[1-9]\d{7,14}$/

export function normalizePhone(value: string): string {
  let compact=value.trim().replace(/[\s().-]/g,'')
  if(compact.startsWith('00'))compact=`+${compact.slice(2)}`
  if(/^0\d{9}$/.test(compact))compact=`+212${compact.slice(1)}`
  else if(/^212\d{9}$/.test(compact))compact=`+${compact}`
  return compact
}

export function isValidPhone(value:string,required=true):boolean {
  if(!value.trim())return !required
  return phonePattern.test(normalizePhone(value))
}

export function phoneInput(value:string):string {
  return value.replace(/[^\d+\s().-]/g,'').slice(0,24)
}

export const phonePlaceholder='Ex. 06 12 34 56 78'
export const phonePatternHtml='^(\\+|00)?[0-9][0-9 .()-]{7,22}$'
