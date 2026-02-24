import React from 'react';
import { render } from '@testing-library/react-native';
import Badge, { RoleBadge, StatusBadge } from '../Badge';

describe('Badge components', () => {
    it('renders count-only badge and caps value at 99+', () => {
        const { getByText } = render(<Badge count={120} />);

        expect(getByText('99+')).toBeTruthy();
    });

    it('renders label and optional count', () => {
        const { getByText } = render(<Badge label="Pending" variant="warning" count={2} />);

        expect(getByText('Pending')).toBeTruthy();
        expect(getByText('2')).toBeTruthy();
    });

    it('maps status badge variants for known and unknown statuses', () => {
        const known = render(<StatusBadge status="approved" />);
        const unknown = render(<StatusBadge status="staged" />);

        expect(known.getByText('Approved')).toBeTruthy();
        expect(unknown.getByText('staged')).toBeTruthy();
    });

    it('maps role badge labels', () => {
        const { getByText } = render(
            <>
                <RoleBadge role="investor" />
                <RoleBadge role="project_admin" />
                <RoleBadge role="super_admin" />
            </>,
        );

        expect(getByText('Investor')).toBeTruthy();
        expect(getByText('Admin')).toBeTruthy();
        expect(getByText('Super Admin')).toBeTruthy();
    });
});
