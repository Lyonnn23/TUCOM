# Architecture rules

- Handle station calculator query handoffs inside TripPlanner using React Router search parameters; recalculate while pricing/vehicle data hydrates, but never overwrite a subsequently selected trip.