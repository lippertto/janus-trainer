import Paper from '@mui/material/Paper';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import React from 'react';
import {
  CompensationClassCreateRequest,
  CompensationClassDto,
  CompensationValueDto,
} from '@/lib/dto';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useMutation } from '@tanstack/react-query';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';
import { API_COMPENSATION_CLASSES } from '@/lib/routes';
import { compareByField, replaceElementWithId } from '@/lib/sort-and-filter';
import { showError } from '@/lib/notifications';
import { useConfirm } from 'material-ui-confirm';
import CompensationClassDialog from '@/app/configure/compensation-values/CompensationClassDialog';

function CompensationClassList(props: {
  compensationClasses: CompensationClassDto[];
  activeCompensationClass: CompensationClassDto | null;
  setActiveCompensationClass: (v: CompensationClassDto | null) => void;
}) {
  return (
    <List>
      {props.compensationClasses
        .toSorted((a, b) => compareByField(a, b, 'name'))
        .map((cc) => (
          <ListItemButton
            onClick={() => props.setActiveCompensationClass(cc)}
            selected={props.activeCompensationClass?.id === cc.id}
            key={cc.id}
          >
            <ListItemText>{cc.name}</ListItemText>
          </ListItemButton>
        ))}
    </List>
  );
}

export default function CompensationClassCard(props: {
  compensationClasses: CompensationClassDto[];
  setCompensationClasses: (v: CompensationClassDto[]) => void;
  activeCompensationClass: CompensationClassDto | null;
  setActiveCompensationClass: (v: CompensationClassDto | null) => void;
  accessToken: string;
}) {
  const {
    activeCompensationClass,
    setActiveCompensationClass,
    compensationClasses,
    setCompensationClasses,
  } = { ...props };

  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  const deleteMutation = useMutation({
    mutationFn: (value: CompensationClassDto) => {
      return deleteFromApi(
        `${API_COMPENSATION_CLASSES}`,
        value,
        props.accessToken,
      );
    },
    onSuccess: (deletedValue) => {
      setActiveCompensationClass(null);
      setCompensationClasses(
        compensationClasses.filter((cc) => cc.id !== deletedValue.id),
      );
    },
    onError: (e) => {
      showError(`Fehler beim Löschen der Pauschalen-Gruppe`, e.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: (value: CompensationClassCreateRequest) => {
      return createInApi<CompensationClassDto>(
        `${API_COMPENSATION_CLASSES}`,
        value,
        props.accessToken,
      );
    },
    onSuccess: (createdValue) => {
      setCompensationClasses([...compensationClasses, createdValue]);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen der Pauschalen-Gruppe`, e.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (value: CompensationClassCreateRequest) => {
      return updateInApi<CompensationClassDto>(
        `${API_COMPENSATION_CLASSES}`,
        activeCompensationClass!.id,
        value,
        props.accessToken,
      );
    },
    onSuccess: (createdValue) => {
      setCompensationClasses(
        replaceElementWithId(compensationClasses, createdValue),
      );
    },
    onError: (e) => {
      showError(`Fehler beim Aktualisieren der Pauschalen-Gruppe`, e.message);
    },
  });

  const confirm = useConfirm();
  const handleDeleteClick = () => {
    confirm({
      title: 'Pauschale löschen?',
      description: `Soll die Pauschalen-Gruppe "${activeCompensationClass?.name}" gelöscht werden?`,
    }).then(({ confirmed }) => {
      if (!confirmed) return;
      deleteMutation.mutate(activeCompensationClass!);
    });
  };

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Pauschalen-Gruppen</Typography>
          <ButtonGroup>
            <Button
              onClick={() => {
                setActiveCompensationClass(null);
                setDialogOpen(true);
              }}
            >
              Hinzufügen
            </Button>
            <Button
              disabled={!activeCompensationClass}
              onClick={handleDeleteClick}
            >
              Löschen
            </Button>
            <Button onClick={() => setDialogOpen(true)}>Bearbeiten</Button>
          </ButtonGroup>
          <CompensationClassList
            compensationClasses={props.compensationClasses}
            activeCompensationClass={activeCompensationClass}
            setActiveCompensationClass={setActiveCompensationClass}
          />
        </Stack>
      </Paper>
      <CompensationClassDialog
        open={dialogOpen}
        toEdit={activeCompensationClass}
        handleClose={() => setDialogOpen(false)}
        handleSave={
          activeCompensationClass
            ? updateMutation.mutate
            : createMutation.mutate
        }
      />
    </>
  );
}
