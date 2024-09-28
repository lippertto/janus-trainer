import Paper from '@mui/material/Paper';
import { JanusSession } from '@/lib/auth';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import React, { Suspense } from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { CircularProgress } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInApi } from '@/lib/fetch';
import { DisciplineCreateRequest, DisciplineDto } from '@/lib/dto';
import { API_DISCIPLINES } from '@/lib/routes';
import { showError } from '@/lib/notifications';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { costCentersQuery } from './queries';
import Box from '@mui/system/Box';
import { compareNamed } from '@/lib/sort-and-filter';
import { DisciplineDialog } from '@/app/offerings/cost-centers/DisciplineDialog';

function DisciplineList(props: {
  disciplines: DisciplineDto[];
  selectedDisciplineId: number | null;
  setSelectedDisciplineId: (v: number) => void;
}) {
  return (
    <List style={{ maxHeight: 500, overflow: 'auto' }}>
      {props.disciplines.map((d) => (
        <ListItemButton
          key={d.id}
          onClick={() => {
            props.setSelectedDisciplineId(d.id);
          }}
          selected={props.selectedDisciplineId === d.id}
        >
          <ListItemText primary={d.name} secondary={d.costCenterId} />
        </ListItemButton>
      ))}
    </List>
  );
}

function DisciplineCardContents(props: { session: JanusSession }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState<boolean>(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<
    number | null
  >(null);
  const { data: costCenters } = costCentersQuery(props.session.accessToken);
  costCenters.sort(compareNamed);

  const disciplinesAddMutation = useMutation({
    mutationFn: (data: DisciplineCreateRequest) => {
      return createInApi<DisciplineDto>(
        API_DISCIPLINES,
        data,
        props.session.accessToken,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [API_DISCIPLINES] });
    },
    onError: () => {
      showError('Konnte Kostenstelle nicht hinzufügen');
    },
  });

  return (
    <Stack spacing={2}>
      <ButtonGroup>
        <Button
          onClick={() => {
            setSelectedDisciplineId(null);
            setOpen(true);
          }}
        >
          Hinzufügen
        </Button>
        <Button
          onClick={() => {
            setOpen(true);
          }}
          disabled={!selectedDisciplineId}
        >
          Bearbeiten
        </Button>
      </ButtonGroup>
      <Box>
        <DisciplineList
          disciplines={costCenters}
          selectedDisciplineId={selectedDisciplineId}
          setSelectedDisciplineId={setSelectedDisciplineId}
        />
      </Box>
      <DisciplineDialog
        open={open}
        handleClose={() => setOpen(false)}
        handleSave={disciplinesAddMutation.mutate}
        toEdit={costCenters.find((d) => d.id === selectedDisciplineId) ?? null}
      />
    </Stack>
  );
}

export default function DisciplineCard(props: { session: JanusSession }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Kostenstellen</Typography>
        <Suspense fallback={<CircularProgress />}>
          <DisciplineCardContents session={props.session} />
        </Suspense>
      </Stack>
    </Paper>
  );
}
