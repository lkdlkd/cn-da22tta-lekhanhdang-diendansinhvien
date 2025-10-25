
import React, { useEffect, useState } from 'react';
import { getAllUsers, deleteUser } from '../Utils/api';
import { Outlet } from 'react-router-dom';
export default function LayoutAdmin() {
	

	return (
		<Outlet />
	);
}
