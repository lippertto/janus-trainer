import {
  CompensationClassDto,
  CompensationValueCreateRequest,
  CompensationValueDto,
  CompensationValueUpdateRequest,
} from '@/lib/dto';
import Paper from '@mui/material/Paper';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import React from 'react';
import List from '@mui/material/List';
import { centsToHumanReadable } from '@/lib/formatters';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CompensationValueDialog from '@/app/configure/compensation-values/CompensationValueDialog';
import { useMutation } from '@tanstack/react-query';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';
import { API_COMPENSATION_CLASSES } from '@/lib/routes';
import { compareByField, replaceElementWithId } from '@/lib/sort-and-filter';
import { showError, showSuccess } from '@/lib/notifications';
import { useConfirm } from 'material-ui-confirm';


function CompensationValueList(
  props: {
    compensationValues: CompensationValueDto[],
    activeCompensationValue: CompensationValueDto | null,
    setActiveCompensationValue: (v: CompensationValueDto | null) => void,
  },
) {
  return <List>
    {props.compensationValues
      .toSorted((a, b) => compareByField(a, b, 'cents'))
      .map((cv) => {
      let secondary = centsToHumanReadable(cv.cents);
      if (cv.durationMinutes) {
        secondary += `, ${cv.durationMinutes}min`;
      }

      return <ListItemButton
        onClick={() => props.setActiveCompensationValue(cv)}
        selected={(props.activeCompensationValue?.id === cv.id)}
        key={cv.id}
      >
        <ListItemText primary={`${cv.description}`} secondary={secondary} />
      </ListItemButton>;
    })}
  </List>;
}

function replaceCompensationValueInClass(compensationClass: CompensationClassDto, compensationValue: CompensationValueDto): CompensationClassDto {
  const newValues = replaceElementWithId(compensationClass.compensationValues ?? [], compensationValue);
  return { ...compensationClass, compensationValues: newValues };
}

export function CompensationValueCard(props: {
  activeCompensationClass: CompensationClassDto | null,
  setActiveCompensationClass: (v: CompensationClassDto | null) => void,
  setCompensationClasses: (v: CompensationClassDto[]) => void,
  compensationClasses: CompensationClassDto[],
  accessToken: string,
}) {
  const {
    activeCompensationClass,
    setActiveCompensationClass,
    compensationClasses,
    setCompensationClasses,
  } = { ...props };

  const [compensationValueDialogOpen, setCompensationValueDialogOpen] = React.useState<boolean>(false);
  const [activeCompensationValue, setActiveCompensationValue] = React.useState<CompensationValueDto | null>(null);


  const deleteCompensationValueMutation = useMutation({
    mutationFn: (value: CompensationValueDto) => {
      return deleteFromApi(`${API_COMPENSATION_CLASSES}/${activeCompensationClass?.id}/compensation-values`, value, props.accessToken);
    },
    onSuccess: (deletedValue) => {
      const newClass: CompensationClassDto = {
        ...activeCompensationClass!,
        compensationValues: activeCompensationClass?.compensationValues?.filter((cv) => (cv.id !== deletedValue.id)) ?? [],
      };
      setActiveCompensationValue(null);
      setActiveCompensationClass(newClass);
      setCompensationClasses(replaceElementWithId(compensationClasses, newClass));
    },
    onError: (e) => {
      showError(`Fehler beim Löschen der Pauschale`, e.message);
    },
  });

  const confirm = useConfirm();
  const handleDeleteClick = () => {
    confirm({
      title: 'Pauschale löschen?',
      description: `Soll die Pauschale "${activeCompensationValue?.description}" gelöscht werden?`,
    })
      .then(
        () => deleteCompensationValueMutation.mutate(activeCompensationValue!),
      );
  };


  const createCompensationValueMutation = useMutation({
    mutationFn: (data: CompensationValueCreateRequest) => {
      return createInApi<CompensationValueDto>(`${API_COMPENSATION_CLASSES}/${activeCompensationClass?.id}/compensation-values`, data, props.accessToken);
    },
    onSuccess: (createdValue: CompensationValueDto) => {
      showSuccess(`Pauschale ${createdValue.description} wurde erstellt`);
      if (!activeCompensationClass) return;
      const newClass = {
        ...activeCompensationClass,
        compensationValues: [...activeCompensationClass.compensationValues!, createdValue],
      };
      setCompensationClasses(replaceElementWithId(compensationClasses, newClass));
      setActiveCompensationClass(newClass);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen der Pauschale`, e.message);
    },
  });

  const updateCompensationValueMutation = useMutation({
    mutationFn: (data: CompensationValueUpdateRequest) => {
      return updateInApi<CompensationValueDto>(`${API_COMPENSATION_CLASSES}/${activeCompensationClass?.id}/compensation-values`, activeCompensationValue!.id, data, props.accessToken);
    },
    onSuccess: (updatedValue: CompensationValueDto) => {
      showSuccess(`Pauschale ${updatedValue.description} wurde aktualisiert`);
      if (!activeCompensationClass) return;
      const newClass = replaceCompensationValueInClass(activeCompensationClass, updatedValue);
      setCompensationClasses(replaceElementWithId(compensationClasses, newClass));
      setActiveCompensationClass(newClass);
    },
    onError: (e) => {
      showError(`Fehler beim Aktualisieren der Pauschale`, e.message);
    },
  });


  return <>
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant={'h5'}>Pauschalen</Typography>
        <ButtonGroup>
          <Button
            disabled={!props.activeCompensationClass}
            onClick={() => {
              setActiveCompensationValue(null);
              setCompensationValueDialogOpen(true);
            }}>Hinzufügen</Button>
          <Button
            disabled={!activeCompensationValue}
            onClick={handleDeleteClick}
          >Löschen</Button>
          <Button
            disabled={!activeCompensationValue}
            onClick={() => {
              setCompensationValueDialogOpen(true);
            }}
          >Bearbeiten</Button>
        </ButtonGroup>
        <CompensationValueList
          compensationValues={props.activeCompensationClass?.compensationValues ?? []}
          activeCompensationValue={activeCompensationValue}
          setActiveCompensationValue={setActiveCompensationValue} />
      </Stack>
    </Paper>
    <CompensationValueDialog
      open={compensationValueDialogOpen}
      toEdit={activeCompensationValue}
      handleClose={
        () => {
          setCompensationValueDialogOpen(false);
        }
      }
      handleSave={
        activeCompensationValue ? updateCompensationValueMutation.mutate :
          createCompensationValueMutation.mutate
      }
    />

  </>;
}