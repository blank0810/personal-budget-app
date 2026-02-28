'use client';

import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { WelcomeStep } from './steps/WelcomeStep';
import { CurrencyStep } from './steps/CurrencyStep';
import { AccountStep } from './steps/AccountStep';
import { CompleteStep } from './steps/CompleteStep';

const STEPS = ['Welcome', 'Currency', 'Account', 'Complete'];

interface OnboardingWizardProps {
	userName: string;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
	const [currentStep, setCurrentStep] = useState(0);

	const progress = ((currentStep + 1) / STEPS.length) * 100;

	return (
		<div className='w-full max-w-lg space-y-8'>
			<div className='space-y-2'>
				<div className='flex justify-between text-sm text-muted-foreground'>
					<span>
						Step {currentStep + 1} of {STEPS.length}
					</span>
					<span>{STEPS[currentStep]}</span>
				</div>
				<Progress value={progress} className='h-2' />
			</div>

			<div className='flex justify-center'>
				{currentStep === 0 && (
					<WelcomeStep
						userName={userName}
						onNext={() => setCurrentStep(1)}
					/>
				)}
				{currentStep === 1 && (
					<CurrencyStep
						onNext={() => setCurrentStep(2)}
						onBack={() => setCurrentStep(0)}
					/>
				)}
				{currentStep === 2 && (
					<AccountStep
						onNext={() => setCurrentStep(3)}
						onBack={() => setCurrentStep(1)}
					/>
				)}
				{currentStep === 3 && <CompleteStep />}
			</div>
		</div>
	);
}
