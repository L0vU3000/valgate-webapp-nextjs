import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Design System Gallery Implementation', () => {
  const pagePath = path.join(process.cwd(), 'app/(shell)/design-system/page.tsx');

  it('should exist and contain required design system elements', () => {
    // 1. File must exist
    expect(fs.existsSync(pagePath), 'Page file app/(shell)/design-system/page.tsx must exist').toBe(true);

    const content = fs.readFileSync(pagePath, 'utf8');

    // 2. Must use required primitives
    expect(content, 'Page must import and use Button component').toContain('Button');
    expect(content, 'Page must import and use EmptyState component').toContain('EmptyState');

    // 3. Must contain required gallery headings
    const requiredHeadings = [
      'Design System Reference',
      'Button Variants',
      'Typography Hierarchy',
      'Semantic Colors',
    ];

    requiredHeadings.forEach(heading => {
      expect(content, `Page must contain heading: \"${heading}\"`).toContain(heading);
    });
  });
});
