import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import React from 'react';

export default function UserButtonGroup(props: {
  handleAddUser: () => void;
  handleDeleteUser: () => void;
  handleEditUser: () => void;
  anyUserIsActive: boolean;
}) {
  return (
    <>
      <ButtonGroup>
        <Button
          startIcon={<PersonAddIcon />}
          onClick={props.handleAddUser}
          data-testid={'add-user-button'}
        >
          hinzufügen
        </Button>
        <Button
          startIcon={<DeleteIcon />}
          onClick={props.handleDeleteUser}
          disabled={!props.anyUserIsActive}
          data-testid="delete-user-button"
        >
          löschen
        </Button>
        <Button
          startIcon={<EditIcon />}
          onClick={props.handleEditUser}
          disabled={!props.anyUserIsActive}
        >
          bearbeiten
        </Button>
      </ButtonGroup>
    </>
  );
}
