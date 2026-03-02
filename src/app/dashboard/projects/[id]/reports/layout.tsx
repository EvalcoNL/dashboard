export default function ReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ margin: "0 auto", padding: "32px" }}>
            {children}
        </div>
    );
}
