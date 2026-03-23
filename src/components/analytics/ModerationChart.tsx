import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ModerationProps {
    data: { name: string; value: number }[];
}

const chartConfig = {
    approved: { label: "Approved", color: "#10b981" },
    pending: { label: "Pending", color: "#f59e0b" },
    flagged: { label: "Flagged", color: "#f97316" },
    blocked: { label: "Blocked", color: "#ef4444" },
} satisfies ChartConfig;

const COLORS = {
    approved: "#10b981",
    pending: "#f59e0b",
    flagged: "#f97316",
    blocked: "#ef4444",
};

export function ModerationChart({ data }: ModerationProps) {
    const chartData = data.map(entry => ({
        ...entry,
        fill: COLORS[entry.name as keyof typeof COLORS] || "hsl(var(--muted))"
    }));

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Moderation Status</CardTitle>
                <CardDescription>Comment safety breakdown</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
