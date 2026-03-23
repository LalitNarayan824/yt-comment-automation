import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, HelpCircle } from "lucide-react";

interface InsightsProps {
    insights: {
        unansweredQuestions: number;
        highPriorityPending: number;
        ignoredNegative: number;
    };
}

export function InsightsPanel({ insights }: InsightsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Actionable Insights</CardTitle>
                <CardDescription>Items requiring your immediate attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {insights.highPriorityPending > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>High Priority Items</AlertTitle>
                        <AlertDescription>
                            You have {insights.highPriorityPending} pending comments marked as high priority.
                        </AlertDescription>
                    </Alert>
                )}

                {insights.ignoredNegative > 0 && (
                    <Alert>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <AlertTitle className="text-orange-500">Unresolved Negative Comments</AlertTitle>
                        <AlertDescription>
                            There are {insights.ignoredNegative} comments with negative sentiment awaiting a reply.
                        </AlertDescription>
                    </Alert>
                )}

                {insights.unansweredQuestions > 0 && (
                    <Alert>
                        <HelpCircle className="h-4 w-4 text-blue-500" />
                        <AlertTitle className="text-blue-500">Unanswered Questions</AlertTitle>
                        <AlertDescription>
                            Your audience has asked {insights.unansweredQuestions} questions that are still unanswered.
                        </AlertDescription>
                    </Alert>
                )}

                {insights.highPriorityPending === 0 && insights.ignoredNegative === 0 && insights.unansweredQuestions === 0 && (
                    <div className="text-center p-4 text-muted-foreground">
                        You're all caught up! No critical actions required.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
