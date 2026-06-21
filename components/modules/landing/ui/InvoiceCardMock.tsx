'use client';

/**
 * InvoiceCardMock — standalone invoice card visual.
 * Extracted from landing-preview; used by /invoicing page (not FeaturesBento).
 */
export function InvoiceCardMock() {
	return (
		<div className='space-y-2'>
			<div className='flex items-center justify-between rounded-md border border-l-border bg-l-surface-1 px-3 py-2.5'>
				<div>
					<p className='font-mono text-[12px] font-semibold text-l-text-1'>#INV-0042</p>
					<p className='text-[10px] text-l-text-4'>Acme Co · Web design retainer</p>
				</div>
				<div className='text-right'>
					<p className='font-mono text-[13px] font-bold text-l-text-1'>₱45,000</p>
					<span className='text-[9px] font-medium text-l-accent'>Sent · due Jun 15</span>
				</div>
			</div>
			<div className='flex items-center justify-between rounded-md border border-l-border bg-l-surface-1 px-3 py-2.5'>
				<div>
					<p className='font-mono text-[12px] font-semibold text-l-text-1'>#INV-0041</p>
					<p className='text-[10px] text-l-text-4'>Dev retainer · May</p>
				</div>
				<div className='text-right'>
					<p className='font-mono text-[13px] font-bold text-l-text-1'>₱38,000</p>
					<span className='text-[9px] font-semibold text-emerald-400'>Paid</span>
				</div>
			</div>
		</div>
	);
}
