import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from './src/navigation/AppNavigator';

describe('<AppNavigator />', () => {
  it('debería renderizar la estructura base de navegación sin crashear', async () => {
    const screen = await render(<AppNavigator />);
    expect(screen).toBeDefined();
  });
});
