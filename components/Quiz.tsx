import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, HelpCircle, RefreshCcw } from 'lucide-react';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion, ScriptureResponse } from '../types';

interface QuizProps {
  scripture: ScriptureResponse;
}

const Quiz: React.FC<QuizProps> = ({ scripture }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const loadQuiz = async () => {
    setLoading(true);
    setQuestions([]);
    setQuizComplete(false);
    setScore(0);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);

    try {
      const data = await generateQuiz(scripture.reference, scripture.verseText);
      setQuestions(data);
    } catch (err) {
      console.error("Failed to load quiz", err);
    } finally {
      setLoading(false);
    }
  };

  // Load quiz when component mounts or scripture changes
  useEffect(() => {
    loadQuiz();
  }, [scripture.reference]);

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    
    if (index === questions[currentIndex].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-3" />
        <p className="text-gray-500 font-hand text-lg">Creating a quiz for {scripture.reference}...</p>
      </div>
    );
  }

  if (questions.length === 0) {
     return (
       <div className="p-6 border border-gray-200 rounded-xl bg-white text-center">
         <p className="text-gray-500 mb-4">Could not generate a quiz at this time.</p>
         <button onClick={loadQuiz} className="text-sm underline text-gray-900">Try Again</button>
       </div>
     );
  }

  if (quizComplete) {
    return (
      <div className="text-center p-8 bg-white rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="font-serif text-2xl font-bold mb-4">Quiz Complete!</h3>
        <div className="font-hand text-6xl font-bold text-yellow-500 mb-4">
          {score}/{questions.length}
        </div>
        <p className="text-gray-600 mb-6">
          {score === questions.length 
            ? "Perfect score! You know your scripture!" 
            : "Good effort! Keep studying!"}
        </p>
        <button 
          onClick={loadQuiz}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Take Another Quiz
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header / Progress */}
      <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-yellow-600" />
            <span className="font-bold text-yellow-800 text-sm uppercase tracking-wider">Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <span className="font-hand font-bold text-gray-500">Score: {score}</span>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-serif font-semibold text-gray-900 mb-6 leading-relaxed">
          {currentQ.question}
        </h3>

        <div className="space-y-3 mb-6">
          {currentQ.options.map((option, idx) => {
            let buttonStyle = "border-gray-200 hover:border-gray-400 hover:bg-gray-50";
            let icon = null;

            if (isAnswered) {
              if (idx === currentQ.correctAnswerIndex) {
                buttonStyle = "border-green-500 bg-green-50 text-green-800";
                icon = <CheckCircle className="w-5 h-5 text-green-600" />;
              } else if (idx === selectedOption) {
                buttonStyle = "border-red-500 bg-red-50 text-red-800";
                icon = <XCircle className="w-5 h-5 text-red-600" />;
              } else {
                buttonStyle = "border-gray-100 text-gray-400 opacity-50";
              }
            } else if (selectedOption === idx) {
                buttonStyle = "border-gray-900 bg-gray-50";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center justify-between ${buttonStyle}`}
              >
                <span className="font-medium">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-lg"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
