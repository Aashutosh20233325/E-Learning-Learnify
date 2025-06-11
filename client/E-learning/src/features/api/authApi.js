import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice"; // Ensure correct path

const USER_API = "http://localhost:8080/api/v1/user/";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: fetchBaseQuery({
        baseUrl: USER_API,
        credentials: "include",
    }),
    endpoints: (builder) => ({
        registerUser: builder.mutation({
            query: (inputData) => {
                console.log("inputData", inputData); // ✅ Valid debug log
                return {
                url: "register",
                method: "POST",
                body: inputData,
                };
            },
            }),

        loginUser: builder.mutation({
            query: (inputData) => ({
                
                url: "login",
                method: "POST",
                body: inputData,
            }),
            
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    dispatch(userLoggedIn({ user: result.data.user }));
                } catch (error) {
                    console.error("Login Error:", error);
                }
            }
        }),
        logoutUser: builder.mutation({
            query: () => ({
                url: "logout",
                method: "GET"
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    dispatch(userLoggedOut({ user: null }));
                } catch (error) {
                    console.error("Login Error:", error);
                }
            }
        }),
        loadUser:builder.query({
            query:()=>({
                url:"profile",
                method:"GET"
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
        
                    dispatch(userLoggedIn({ user: result.data.user }));
                } catch (error) {
                    console.error("Login Error:", error);
                }
            }
        }),
    
        
        updateUser: builder.mutation({
            query: (formData) => ({
                url:"profile/update",
                method:"PUT",
                body:formData,
                credentials:"include"
            })
        })
    }),

});

export const { useRegisterUserMutation, useLoginUserMutation ,useLoadUserQuery,useLogoutUserMutation,useUpdateUserMutation} = authApi;
export default authApi;
