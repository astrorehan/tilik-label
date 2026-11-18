import { Icon } from '@/components/icons/icon';
import { formatAssistantAnswer } from '@/domain/assistant';
import { cn } from '@/lib/cn';

export function AssistantAnswer({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[0.9375rem] leading-relaxed wrap-anywhere text-ink-2">
      {formatAssistantAnswer(text).map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return <p key={index} className={cn(index === 0 && 'font-semibold text-ink')}>{block.text}</p>;
          case 'bullets':
            return (
              <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-brand">
                {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
              </ul>
            );
          case 'numbered':
            return (
              <ol key={index} start={block.start} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand">
                {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
              </ol>
            );
          case 'example':
            return (
              <div key={index} className="rounded-r-xl border-s-3 border-gold bg-gold-tint px-3.5 py-2.5">
                <p className="mb-0.5 flex items-center gap-1.5 text-xs font-bold text-gold-deep">
                  <Icon name="tag" size={15} />
                  Contoh penulisan
                </p>
                <p className="text-ink">{block.text}</p>
              </div>
            );
        }
      })}
    </div>
  );
}
