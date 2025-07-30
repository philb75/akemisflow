import DashboardLayout from "@/components/layout/DashboardLayout"

export default function ReportingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}