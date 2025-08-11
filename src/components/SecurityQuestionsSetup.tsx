import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Plus, X, CheckCircle2 } from 'lucide-react';
import { setupSecurityQuestions, SECURITY_QUESTIONS } from '@/services/passwordManagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SecurityQuestionsSetupProps {
  onComplete: () => void;
}

const SecurityQuestionsSetup: React.FC<SecurityQuestionsSetupProps> = ({ onComplete }) => {
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(['', '', '']);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();

  const addSecurityQuestion = () => {
    if (selectedQuestions.length >= 5) {
      setError('You can select up to 5 security questions');
      return;
    }
    setSelectedQuestions([...selectedQuestions, '']);
    setError('');
  };

  const removeSecurityQuestion = (index: number) => {
    if (selectedQuestions.length <= 3) {
      setError('You need at least 3 security questions');
      return;
    }
    
    const questionId = selectedQuestions[index];
    const newSelected = selectedQuestions.filter((_, i) => i !== index);
    setSelectedQuestions(newSelected);
    
    if (questionId && questionAnswers[questionId]) {
      const newAnswers = { ...questionAnswers };
      delete newAnswers[questionId];
      setQuestionAnswers(newAnswers);
    }
    setError('');
  };

  const updateSecurityQuestion = (index: number, questionId: string) => {
    const newSelected = [...selectedQuestions];
    const oldQuestionId = newSelected[index];
    newSelected[index] = questionId;
    setSelectedQuestions(newSelected);
    
    // Clear old answer if question changed
    if (oldQuestionId && oldQuestionId !== questionId && questionAnswers[oldQuestionId]) {
      const newAnswers = { ...questionAnswers };
      delete newAnswers[oldQuestionId];
      setQuestionAnswers(newAnswers);
    }
    setError('');
  };

  const updateAnswer = (questionId: string, answer: string) => {
    setQuestionAnswers({ ...questionAnswers, [questionId]: answer });
    setError('');
  };

  const getAvailableQuestions = (currentIndex: number) => {
    const otherSelected = selectedQuestions.filter((q, i) => i !== currentIndex && q !== '');
    return SECURITY_QUESTIONS.filter(q => !otherSelected.includes(q.id));
  };

  const handleSetupSecurityQuestions = async () => {
    if (!user) {
      setError('No user authenticated');
      return;
    }

    const validQuestions = selectedQuestions.filter(q => q !== '');
    if (validQuestions.length < 3) {
      setError('Please select at least 3 security questions');
      return;
    }

    const incompleteAnswers = validQuestions.filter(q => !questionAnswers[q] || questionAnswers[q].trim().length < 5);
    if (incompleteAnswers.length > 0) {
      setError('Please provide detailed answers (at least 5 characters) for all selected questions');
      return;
    }

    setLoading(true);
    try {
      const questionsData = validQuestions.map(questionId => ({
        questionId,
        answer: questionAnswers[questionId].trim()
      }));
      
      await setupSecurityQuestions(user.uid, questionsData);
      
      toast({
        title: "Security questions setup complete!",
        description: "Your account is now secured with recovery questions.",
      });
      
      onComplete();
    } catch (error: any) {
      setError('Failed to setup security questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Secure Your Account</CardTitle>
          <p className="text-muted-foreground">
            Set up security questions to help recover your account if you forget your password
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div>• Choose questions with answers only you would know</div>
                <div>• Provide detailed, specific answers</div>
                <div>• You need at least 3 questions (up to 5 allowed)</div>
                <div>• These will be used for password recovery</div>
              </div>
            </AlertDescription>
          </Alert>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </p>
          )}

          <div className="space-y-4">
            {selectedQuestions.map((questionId, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Security Question {index + 1} {index < 3 && <span className="text-red-500">*</span>}
                  </Label>
                  {selectedQuestions.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSecurityQuestion(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <Select 
                  value={questionId} 
                  onValueChange={(value) => updateSecurityQuestion(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a security question" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableQuestions(index).map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {questionId && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Example: {SECURITY_QUESTIONS.find(q => q.id === questionId)?.example}
                    </p>
                    <Input
                      placeholder="Your answer (be specific and detailed)"
                      value={questionAnswers[questionId] || ''}
                      onChange={(e) => updateAnswer(questionId, e.target.value)}
                      className="mt-2"
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {selectedQuestions.length < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={addSecurityQuestion}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Question
            </Button>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleSetupSecurityQuestions}
              disabled={loading || selectedQuestions.filter(q => q !== '').length < 3}
              className="flex-1"
            >
              {loading ? (
                "Setting up..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityQuestionsSetup;
