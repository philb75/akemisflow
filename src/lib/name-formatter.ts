/**
 * Name formatting utilities for supplier names
 * - Last names: UPPERCASE
 * - First/Middle names: Title case (first letter uppercase, rest lowercase)
 */

/**
 * Format last name to UPPERCASE
 * @param name - The last name to format
 * @returns Formatted last name in UPPERCASE
 */
export function formatLastName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  return name.trim().toUpperCase()
}

/**
 * Format first name or middle name to title case
 * @param name - The first or middle name to format
 * @returns Formatted name with first letter uppercase, rest lowercase
 */
export function formatFirstName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

/**
 * Format full name according to business rules
 * @param firstName - The first name
 * @param lastName - The last name  
 * @param middleName - Optional middle name
 * @returns Object with formatted names
 */
export function formatFullName(
  firstName: string, 
  lastName: string, 
  middleName?: string
) {
  return {
    firstName: formatFirstName(firstName),
    lastName: formatLastName(lastName),
    middleName: middleName ? formatFirstName(middleName) : undefined
  }
}

/**
 * Format supplier name data for database storage
 * @param supplierData - Object containing name fields
 * @returns Object with formatted name fields
 */
export function formatSupplierNames<T extends { 
  firstName?: string
  lastName?: string
  middleName?: string
  first_name?: string
  last_name?: string
  middle_name?: string
}>(supplierData: T): T {
  const formatted = { ...supplierData }
  
  // Handle camelCase fields (Prisma/Frontend)
  if (formatted.firstName) {
    formatted.firstName = formatFirstName(formatted.firstName)
  }
  if (formatted.lastName) {
    formatted.lastName = formatLastName(formatted.lastName)
  }
  if (formatted.middleName) {
    formatted.middleName = formatFirstName(formatted.middleName)
  }
  
  // Handle snake_case fields (Supabase)
  if (formatted.first_name) {
    formatted.first_name = formatFirstName(formatted.first_name)
  }
  if (formatted.last_name) {
    formatted.last_name = formatLastName(formatted.last_name)
  }
  if (formatted.middle_name) {
    formatted.middle_name = formatFirstName(formatted.middle_name)
  }
  
  return formatted
}

/**
 * Get display name for a supplier
 * @param firstName - First name
 * @param lastName - Last name
 * @param middleName - Optional middle name
 * @returns Formatted display name
 */
export function getDisplayName(
  firstName: string, 
  lastName: string, 
  middleName?: string
): string {
  const formatted = formatFullName(firstName, lastName, middleName)
  const parts = [formatted.firstName, formatted.middleName, formatted.lastName].filter(Boolean)
  return parts.join(' ')
}