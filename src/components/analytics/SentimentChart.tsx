import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface SentimentProps {
    data: { name: string; value: number }[];
}

const chartConfig = {
    positive: { label: "Positive", color: "#10b981" },
    neutral: { label: "Neutral", color: "#eab308" },
    negative: { label: "Negative", color: "#ef4444" },
} satisfies ChartConfig;

// Fallback colors if not matched
const COLORS = ["#10b981", "#eab308", "#ef4444", "#3b82f6", "#8b5cf6"];

export function SentimentChart({ data }: SentimentProps) {
    // Add fill color logic for Recharts pie
    const chartData = data.map((entry, index) => ({
        ...entry,
        fill: chartConfig[entry.name as keyof typeof chartConfig]?.color || COLORS[index % COLORS.length]
    }));

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Sentiment</CardTitle>
                <CardDescription>Audience sentiment distribution</CardDescription>
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
