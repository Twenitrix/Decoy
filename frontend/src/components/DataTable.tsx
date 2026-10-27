import React from 'react';
import { motion, tableRowVariant } from './motion';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-[#98A6C4] surface-elevated rounded-2xl">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl surface-elevated">
      <table className="w-full text-left text-sm text-[#F4F7FF] border-collapse">
        <thead>
          <tr className="border-b border-[#263149]/70 bg-[#151D2F]/60 text-[11px] font-semibold uppercase tracking-wider text-[#98A6C4]">
            {columns.map((col) => (
              <th key={col.key} className={`px-5 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#263149]/40">
          {data.map((item) => (
            <motion.tr
              key={keyExtractor(item)}
              variants={tableRowVariant}
              initial="hidden"
              animate="show"
              onClick={() => onRowClick && onRowClick(item)}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
              className={`transition-colors ${
                onRowClick
                  ? 'cursor-pointer hover:bg-[#151D2F]/80 focus:bg-[#151D2F]'
                  : 'hover:bg-[#151D2F]/40'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-5 py-4 ${col.className || ''}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
