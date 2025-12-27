'use client';

import {
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBreakdown } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';

interface CategoryBreakdownChartProps {
	data: CategoryBreakdown[];
}

const COLORS = [
	'#0088FE',
	'#00C49F',
	'#FFBB28',
	'#FF8042',
	'#8884d8',
	'#82ca9d',
];

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
	return (
		<Card className='col-span-4'>
			<CardHeader>
				<CardTitle>Spending by Category</CardTitle>
			</CardHeader>
			<CardContent className='pl-2'>
				<ResponsiveContainer width='100%' height={350}>
					<PieChart>
						<Pie
							data={data}
							cx='50%'
							cy='50%'
							labelLine={false}
							label={({ name, percent }) =>
								`${name} ${
									typeof percent === 'number'
										? (percent * 100).toFixed(0)
										: '0'
								}%`
							}
							outerRadius={120}
							fill='#8884d8'
							dataKey='amount'
							nameKey='categoryName'
						>
							{data.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={
										entry.color ||
										COLORS[index % COLORS.length]
									}
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value: number | undefined) =>
								value != null ? formatCurrency(value) : ''
							}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
