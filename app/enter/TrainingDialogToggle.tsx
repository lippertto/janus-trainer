import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import React from 'react';

export type TrainingDialogTypes = 'training' | 'custom';

export function TrainingDialogToggle(props: {
  disabled: boolean;
  setType: (v: TrainingDialogTypes) => void;
  type: TrainingDialogTypes;
}) {
  const ensureExactlyOneValueSelected = (
    _: any,
    newValues: TrainingDialogTypes,
  ) => {
    if (newValues) {
      props.setType(newValues);
    }
  };

  return (
    <ToggleButtonGroup
      disabled={props.disabled}
      value={props.type}
      color="primary"
      onChange={ensureExactlyOneValueSelected}
      exclusive
      sx={{ justifyContent: 'center' }}
    >
      <ToggleButton value="training">Kurs</ToggleButton>
      <ToggleButton value="custom">Einmal</ToggleButton>
    </ToggleButtonGroup>
  );
}
