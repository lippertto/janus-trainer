# Actors

This document lists the actors which interact with the application.

## Trainers

The Trainers enter their trainings into the app so that they get compensated for the trainings that they have given.

The trainers will usually enter their training right after they have given the lesson.
Most of the time, they do this from their mobile phone.
The entered trainings can be changed any time until the Approver has approved the training.

Also, they want to check which trainings they have given and how the status is, i.e., in which status the training
is (NEW, APPROVED, COMPENSATED).

They want to be able to enter trainings quickly.

Note: They map to the role 'trainer' in Cognito.

## Approver

The approver is in charge of reviewing all trainings that were given and checks if they were correctly entered
into the system.

The approver checks for plausibility, common errors and some rules imposed by the club.
All rules have exceptions, so it must be possible to override the rules.

Examples are:

- No training must be given during holidays.
- The training must not be given by two people.
- The training should be given on its scheduled weekday.

If the Approver finds a training to be plausible, they will approve it.
This means, that the trainer should receive a compensation for the training from the Bursar.

Also, they must be able to correct entries which have obviously not been entered correctly.

The Approver works in the office of the sport club. They work on a PC.

Note: They map to the role 'admin' in Cognito. The separation is purely organisational.

## Bursar

The Bursar checks the approved trainings and issues bank transfers to the trainers to compensate for their work.
The role of the Bursar and the Approver are separated for compliance reasons, but not enforced by the system.

The Bursar works in the office of the sport club. They work on a PC.

The bank transfers are issued by a separate program called StarMoney.
The program accepts SEPA XML files as input.
Hence, this application offers to export the approved trainings as a SEPA XML file.

Note: They map to the role 'admin' in Cognito. The separation is purely organisational.
